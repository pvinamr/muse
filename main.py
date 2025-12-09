from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI()


#model defines what clients must send when creating a new clip. type is the kind of clip (text, url, image) and the actual content. url and title are optional fields.
class ClipCreate(BaseModel):
    type: str
    content: str
    url: Optional[str] = None
    title: Optional[str] = None
    
#model represents what a clip looks like after being saved. id is an auto-incremented unique identifier, created_at is a timestamp
class Clip(BaseModel):
    id: int
    type: str
    content: str
    url: Optional[str] = None
    title: Optional[str] = None
    created_at: datetime
    
    
#temp "database" to store clips in memory. next_id increments with each new clip
clips: List[Clip] = []
next_id = 1
    

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/clips", response_model=Clip)
def create_clip(payload: ClipCreate):
    global next_id
    
    clip = Clip(
        id = next_id, 
        type = payload.type,
        content = payload.content,
        url = payload.url,
        title = payload.title,
        created_at = datetime.utcnow(),
    )
    next_id += 1
    clips.append(clip)
    return clip

@app.get("/clips", response_model=List[Clip])
def list_clips():
    return sorted(clips, key=lambda c: c.created_at, reverse=True)



    
