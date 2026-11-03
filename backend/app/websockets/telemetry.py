import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.simulation.engine import simulation_engine

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    queue = asyncio.Queue()
    simulation_engine.register_listener(queue)
    
    # Send immediate initial state
    init_snapshot = simulation_engine.step_tick()
    await websocket.send_text(json.dumps(init_snapshot.model_dump(mode="json")))
    
    try:
        while True:
            # Wait for either incoming messages or next simulation tick in queue
            msg_task = asyncio.create_task(queue.get())
            rx_task = asyncio.create_task(websocket.receive_text())
            
            done, pending = await asyncio.wait(
                [msg_task, rx_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
                
            if msg_task in done:
                snapshot_data = msg_task.result()
                await websocket.send_text(json.dumps(snapshot_data))
                
            if rx_task in done:
                client_text = rx_task.result()
                # Optional client control messages over websocket
                try:
                    payload = json.loads(client_text)
                    if payload.get("action") == "PING":
                        await websocket.send_text(json.dumps({"type": "PONG"}))
                except Exception:
                    pass
                    
    except WebSocketDisconnect:
        pass
    finally:
        simulation_engine.unregister_listener(queue)

