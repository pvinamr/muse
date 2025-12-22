from fastapi import FastAPI
from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Session, create_engine, select
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from fastapi import HTTPException

app = FastAPI()

DATABASE_URL = "sqlite:///./muse.db"
engine = create_engine(DATABASE_URL, echo=False)

def create_fts():
    """
    Creates an FTS5 virtual table and triggers to keep it in sync with clips.
    Also backfills existing clips into the FTS table.
    """
    with engine.connect() as conn:
        # 1) FTS table (content is indexed)
        conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts
            USING fts5(content, title, url, content='clip', content_rowid='id');
        """))

        # 2) Triggers to keep FTS in sync
        conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS clip_ai AFTER INSERT ON clip BEGIN
              INSERT INTO clips_fts(rowid, content, title, url)
              VALUES (new.id, new.content, new.title, new.url);
            END;
        """))

        conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS clip_ad AFTER DELETE ON clip BEGIN
              INSERT INTO clips_fts(clips_fts, rowid, content, title, url)
              VALUES ('delete', old.id, old.content, old.title, old.url);
            END;
        """))

        conn.execute(text("""
            CREATE TRIGGER IF NOT EXISTS clip_au AFTER UPDATE ON clip BEGIN
              INSERT INTO clips_fts(clips_fts, rowid, content, title, url)
              VALUES ('delete', old.id, old.content, old.title, old.url);
              INSERT INTO clips_fts(rowid, content, title, url)
              VALUES (new.id, new.content, new.title, new.url);
            END;
        """))

        # 3) Backfill existing rows (safe to run multiple times)
        conn.execute(text("""
            INSERT INTO clips_fts(rowid, content, title, url)
            SELECT id, content, title, url
            FROM clip
            WHERE id NOT IN (SELECT rowid FROM clips_fts);
        """))

        conn.commit()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # fine for local dev
    allow_methods=["*"],
    allow_headers=["*"],
)

#metadata is the blueprint based on the information clipped. create_all will use the engine to create any tables that do not yet exist in the database
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

#What API starts up, before serving any requests, run this function
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    create_fts()

#what data is required to create a new clip 
class ClipBase(SQLModel):
    type: str
    content: str
    url: Optional[str] = None
    title: Optional[str] = None

#defines fields in the table when creating a new clip
class Clip(ClipBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClipCreate(ClipBase):
    pass

#output model when reading a clip
class ClipRead(ClipBase):
    id: int
    summary: Optional[str]
    created_at: datetime

@app.get("/health")
def health_check():
    return {"status": "ok"}


#payload contains what the client sent
#clip creates an object in memory
#session creates the database session and adds the relevant clip to the database
@app.post("/clips", response_model=ClipRead)
def create_clip(payload: ClipCreate):
    clip = Clip(
            type=payload.type,
            content=payload.content,
            url=payload.url,
            title=payload.title,
        )
    
    with Session(engine) as session:
        session.add(clip)
        session.commit()
        session.refresh(clip)
        return clip


#opens a DB session, selects all clips sorted by timestamp, returs them as a list 
@app.get("/clips", response_model=List[ClipRead])
def list_clips():
    with Session(engine) as session:
        statement = select(Clip).order_by(Clip.created_at.desc())
        results = session.exec(statement).all()
        return results
    

@app.get("/search", response_model=List[ClipRead])
def search_clips(q: str, limit: int = 50):
    with Session(engine) as session:
        # 1) FTS query → get matching clip IDs
        stmt = text("""
            SELECT rowid
            FROM clips_fts
            WHERE clips_fts MATCH :q
            ORDER BY bm25(clips_fts)
            LIMIT :limit;
        """).bindparams(q=q, limit=limit)

        id_rows = session.exec(stmt).all()
        ids = [row[0] for row in id_rows]

        if not ids:
            return []

        # 2) Fetch actual Clip objects
        clips = session.exec(
            select(Clip).where(Clip.id.in_(ids))
        ).all()

        # 3) Preserve FTS order
        order = {clip_id: i for i, clip_id in enumerate(ids)}
        clips.sort(key=lambda c: order.get(c.id, 10**9))

        return clips

@app.delete("/clips/{clip_id}")
def delete_clip(clip_id: int):
    with Session(engine) as session:
        clip = session.get(Clip, clip_id)
        if not clip:
            raise HTTPException(status_code=404, detail="Clip not found")

        session.delete(clip)
        session.commit()

    return {"ok": True}

#def enrich_clip_summary(content: str) -> str:
    # placeholder. make this an LLM call later
    #return content[:60] + "..." if len(content) > 60 else content
        
        



    
