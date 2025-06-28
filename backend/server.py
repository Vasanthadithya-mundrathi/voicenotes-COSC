from fastapi import FastAPI, APIRouter, HTTPException
from starlette.middleware.cors import CORSMiddleware
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

# In-memory storage
tasks = []
status_checks = []

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(BaseModel):
    title: str

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Task Management Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    """Create a new task"""
    task_obj = Task(**task.dict())
    tasks.append(task_obj)
    return task_obj

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks():
    """Get all tasks"""
    return sorted(tasks, key=lambda t: t.created_at, reverse=True)

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a specific task"""
    for task in tasks:
        if task.id == task_id:
            return task
    raise HTTPException(status_code=404, detail="Task not found")

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    """Update a task"""
    for i, task in enumerate(tasks):
        if task.id == task_id:
            update_data = task_update.dict(exclude_unset=True)
            updated_task = task.copy(update={**update_data, "updated_at": datetime.utcnow()})
            tasks[i] = updated_task
            return updated_task
    raise HTTPException(status_code=404, detail="Task not found")

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    for i, task in enumerate(tasks):
        if task.id == task_id:
            del tasks[i]
            return {"message": "Task deleted successfully"}
    raise HTTPException(status_code=404, detail="Task not found")

@api_router.post("/tasks/toggle/{task_id}", response_model=Task)
async def toggle_task(task_id: str):
    """Toggle task completion status"""
    for i, task in enumerate(tasks):
        if task.id == task_id:
            new_status = not task.completed
            updated_task = task.copy(update={"completed": new_status, "updated_at": datetime.utcnow()})
            tasks[i] = updated_task
            return updated_task
    raise HTTPException(status_code=404, detail="Task not found")

# Voice command endpoint for smart task matching
@api_router.post("/tasks/voice-complete")
async def voice_complete_task(request: dict):
    """Complete task based on voice command with fuzzy matching"""
    spoken_text = request.get("spoken_text", "").lower()
    incomplete_tasks = [task for task in tasks if not task.completed]
    if not incomplete_tasks:
        return {"message": "No incomplete tasks found", "success": False}

    # Simple fuzzy matching - find task with most word matches
    best_match = None
    best_score = 0

    for task in incomplete_tasks:
        task_words = task.title.lower().split()
        spoken_words = spoken_text.split()
        matches = sum(1 for word in task_words if any(word in spoken_word or spoken_word in word for spoken_word in spoken_words))
        score = matches / len(task_words) if task_words else 0
        if score > best_score and score > 0.3:  # Minimum 30% match
            best_score = score
            best_match = task

    if best_match:
        # Mark as completed
        for i, t in enumerate(tasks):
            if t.id == best_match.id:
                updated_task = t.copy(update={"completed": True, "updated_at": datetime.utcnow()})
                tasks[i] = updated_task
                break
        return {
            "message": f"Marked '{best_match.title}' as completed",
            "success": True,
            "task_id": best_match.id
        }
    else:
        return {
            "message": "Could not find a matching task to complete",
            "success": False
        }

@api_router.delete("/tasks/clear-completed")
async def clear_completed_tasks():
    """Clear all completed tasks"""
    before = len(tasks)
    tasks[:] = [task for task in tasks if not task.completed]
    deleted_count = before - len(tasks)
    return {
        "message": f"Cleared {deleted_count} completed tasks",
        "deleted_count": deleted_count
    }

@api_router.delete("/tasks/clear-completed-test")
async def clear_completed_tasks_test():
    """Clear all completed tasks (test endpoint)"""
    before = len(tasks)
    tasks[:] = [task for task in tasks if not task.completed]
    deleted_count = before - len(tasks)
    return {
        "message": f"Cleared {deleted_count} completed tasks",
        "deleted_count": deleted_count
    }

# Health check routes
@api_router.get("/")
async def root():
    return {"message": "Voice Notes to Task List API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.dict())
    status_checks.append(status_obj)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    return list(status_checks)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
