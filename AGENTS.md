## 1. Core Principles

- **Think Before Coding:** Don't jump straight into writing code. Understand the context, identify the root cause of the problem, and design a solution before implementing it.
    
- **Explain the "Why":** When providing a solution, briefly explain _why_ that approach was chosen over the alternatives (e.g., related to memory, time/space complexity, or security).
    
- **Boy Scout Rule:** Always leave the code in a better state than you found it. If you spot a code smell near the area you're working on, do a light refactor.
    
- **Empathy for Low-End Devices:** Always consider that the end-users access this via low-spec Android smartphones and unstable rural connections. Prioritize lightweight DOM, minimal client-side JS, and optimized network requests.
    

## 2. Coding Standards & Practices

- **Tech Stack Adherence:** Strictly use **Next.js (App Router), Tailwind CSS, shadcn/ui, and Supabase** (PostgreSQL). For PDF generation, strictly use **Puppeteer** (run as async jobs, not blocking). For charts, use **Chart.js** (optimized with decimation).
    
- **Defensive Programming:** Always assume bad input. Implement strict input validation and handle edge cases (e.g., WHO LMS calculator limits 0-60 months).
    
- **Robust Error Handling:** Never use empty try-catch blocks. Errors must be logged with context-rich messages and handled gracefully so the application doesn't crash.
    
- **Database Strictness (Crucial):**
    
    - Always apply the **Snapshot Pattern** for generated documents (freeze data as JSONB at the time of creation).
        
    - **Row Level Security (RLS)** MUST be implemented for all tables holding personal data.
        
    - Use **Soft Deletes** (`deleted_at`) for citizen data, never hard deletes.
        
- **Separation of Concerns (SoC):** Separate business logic, UI, and data access. Keep functions/methods small with a single responsibility.
    
- **Security First:** Proactively prevent common security vulnerabilities. Never hardcode credentials. Protect API routes using the Route Permission Matrix defined in the Master Consistency document.
    

## 3. Workflow & SOP

**Phase 1: Context & Constraints Analysis**

- Read the user's prompt carefully.
    
- Check related core project files: `01_PRD_PHASE_1.md`, `02_PRD_PHASE_2.md`, `00_MASTER_CROSS_PHASE_CONSISTENCY.md`, and the specific code file being modified.
    
- If there's ambiguity in the instructions, DO NOT guess. Ask the user for clarification before writing code.
    
- Always check `Design.md` for specific color tokens, typography scales, and spacing before writing UI code — **never improvise new colors or fonts**.
    

**Phase 2: Architectural Proposal (Optional, for large features)**

- Give a brief summary of how you will structure the code.
    
- Mention relevant design patterns if needed. Ensure architectural decisions align with the strict rules in `00_MASTER_CROSS_PHASE_CONSISTENCY.md`.
    

**Phase 3: Implementation**

- Write code that is modular, efficient, and clean.
    
- Add comments only for complex sections (explain _why_ the logic exists, not _what_ the syntax does).
    
- When you finish building a feature, a page, a debug fix, or anything else significant, always `add` and `commit` with a clear message so the development flow stays legible and easy to follow. Avoid pushing on your own.