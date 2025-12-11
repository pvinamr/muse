from fastapi import FastAPI
from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Session, create_engine, select

app = FastAPI()

DATABASE_URL = "sqlite:///./muse.db"
engine = create_engine(DATABASE_URL, echo=False)


#metadata is the blueprint based on the information clipped. create_all will use the engine to create any tables that do not yet exist in the database
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

#What API starts up, before serving any requests, run this function
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

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
    
    clip.summary = enrich_clip_summary(clip.content)
    
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


def enrich_clip_summary(content: str) -> str:
    # placeholder. make this an LLM call later
    return content[:60] + "..." if len(content) > 60 else content
        
        



    
