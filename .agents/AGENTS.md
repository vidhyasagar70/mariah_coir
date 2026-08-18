# Workspace Architectural & Coding Rules

## Modular Architecture Guidelines

Build and maintain the application using a clean, scalable modular architecture.

### Domain & Module Organization
- Organize the codebase by business/domain modules (e.g., `supplier` module for Supplier Management).
- Keep each module's UI, business logic, API/services, models, validation, and tests separated and self-contained where appropriate.

### Clear Separation of Concerns
1. **UI / Presentation**: React pages, views, and module-specific UI components.
2. **API / Controllers**: Request handling, route mapping, parameter extraction.
3. **Business Logic / Services**: Core business calculation algorithms, domain rules, ledger workflows.
4. **Data Access / Repositories**: Database queries, transactions, persistence layers.
5. **Database / Models**: Schema definitions, migration scripts, table models.

### Shared Layers & Utilities
- Keep shared utilities and reusable components in common/shared layers only when they are genuinely reusable across multiple domain modules.
- Avoid tightly coupling modules, duplicate logic, circular dependencies, large monolithic files, and unnecessary abstractions.

### Guidelines for Adding New Features
1. Identify the appropriate domain module.
2. Follow existing architecture and conventions.
3. Keep module-specific logic inside that module.
4. Reuse existing shared components/services when appropriate.
5. Modify other modules only when there is a clear explicit dependency.
6. Keep the code maintainable, modular, and easy to extend.
7. Do not restructure existing working code unnecessarily.
