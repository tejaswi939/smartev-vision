# SmartEV Vision — ER Diagram (Phase 0)

```mermaid
erDiagram
    USER ||--o{ SESSION : conducts
    USER ||--o{ FEEDBACK : gives
    USER ||--o{ RATING : gives
    USER ||--o{ REPORT : generates
    USER ||--o{ AUDIT_LOG : triggers
    USER ||--o{ PASSWORD_RESET_TOKEN : owns
    VEHICLE ||--o{ VEHICLE_PART : contains
    VEHICLE ||--o{ SESSION : viewed_in
    VEHICLE ||--o{ FEEDBACK : about
    VEHICLE ||--o{ RATING : about
    SESSION ||--o{ GAZE_DATA : records
    SESSION ||--o{ INTERACTION_LOG : records
    SESSION ||--o{ HEATMAP_CELL : aggregates
    SESSION ||--o{ EMOTION_DETECTION : records
    VEHICLE_PART ||--o{ GAZE_DATA : targeted_by
    VEHICLE_PART ||--o{ INTERACTION_LOG : targeted_by
    VEHICLE_PART ||--o{ HEATMAP_CELL : targeted_by
```

Authoritative schema: `apps/api/prisma/schema.prisma`.

**Active in Phase 0:** `User`, `PasswordResetToken`, `AuditLog` (exercised by the auth API);
`Vehicle`, `VehiclePart`, `Session` (seeded, surfaced read-only in dashboards).

**Inert until their feature phase:** `GazeData`, `InteractionLog`, `HeatmapCell`,
`EmotionDetection`, `Feedback`, `Rating`, `Report` — schema + seed only, no behavior yet.
