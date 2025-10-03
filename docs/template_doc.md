my-project-template/
├── apps/
│   ├── backend/          # NestJS
│   └── frontend/         # Angular
├── packages/
│   ├── shared-types/     # Interfaces, DTOs, enums partagés
│   ├── shared-utils/     # Utilitaires communs (validation, formatage...)
│   └── shared-config/    # Constantes, configs communes
├── infrastructure/
│   ├── docker/
│   ├── nginx/           # Config reverse proxy
│   └── database/        # Scripts SQL, seeds
├── docs/
├── scripts/             # Build, deploy, dev
└── tools/               # Configs ESLint, Prettier, etc.