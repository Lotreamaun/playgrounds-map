## 1. Implementation

- [x] 1.1 Add `from fastapi.staticfiles import StaticFiles` import in `backend/app/main.py`
- [x] 1.2 Add `app.mount("/photos", StaticFiles(directory="data/photos"), name="photos")` before router inclusion in `main.py`

## 2. Verification

- [x] 2.1 Start backend and confirm GET `/photos/<filename>` returns an image with correct Content-Type
- [x] 2.2 Create a court with a photo via `POST /courts`, then request the `photo_url` and confirm it returns the image
- [x] 2.3 Confirm the frontend court card image loads when a court has a photo
