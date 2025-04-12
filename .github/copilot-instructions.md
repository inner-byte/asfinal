# AI-Powered Subtitle Generator Development Guidelines

## 🔄 Project Awareness & Context
- **Always review these key documents** at the start of a new conversation:
  - `project_goals.md` - For understanding the project's objectives, requirements, and constraints
  - `project_roadmap_and_milestones.md` - For understanding the development phases and timeline
  - `project_structure_rules.md` - For understanding the architectural organization
  - `coding_standards_style_guides.md` - For understanding coding practices to follow
  - `progress.md` - For understanding current development status 
  - `tasks.md` - For understanding current task priorities
- **Follow the phased development approach** as outlined in the roadmap, ensuring foundational components are built before advancing to more complex features
- **Maintain consistency** with the established naming conventions, file structure, and architectural patterns
- **Verify context before proceeding** with any implementation by explicitly referencing the specific section of documentation that supports your approach

## 🏗️ Repository Architecture
- **Respect the repository split** between `abs-ui` (frontend) and `abs-server` (backend)
- **Follow established directory structures**:
  - **Frontend**: Feature-based organization within the Next.js App Router structure
  - **Backend**: MVC-inspired pattern with controllers, services, and routes
- **Organize components by feature** (e.g., VideoUpload, SubtitlePreview, Export) for maintainability and modularity
- **Keep files below 300 lines of code** and split functionality when approaching this limit
- **Use TypeScript types** throughout the project for enforcing type safety
- **Never deviate from the established architecture** without explicit permission and documentation update

## 🔎 Mandatory Pre-Implementation Research Protocol
- **REQUIREMENT: Conduct targeted web searches before beginning ANY implementation** to:
  - Verify and identify the latest stable versions of all required dependencies, packages, and libraries
  - Research and determine the current optimal implementation strategy specifically for our project context
  - Proactively identify any deprecated features, tools, or APIs and find their modern, supported alternatives
  - Document specific version numbers and compatibility information as implementation references
  - Confirm best practices for integrating with our specific technology stack
- **Create a brief research summary** including:
  - Version information for all identified dependencies
  - Links to official documentation and relevant examples
  - Notes about any deprecated features and their replacements
  - Implementation recommendations backed by authoritative sources
- **Flag version conflicts or compatibility issues** before they cause integration problems
- **Document your search process and findings** to justify implementation decisions
- **DO NOT PROCEED with implementation until this research is complete** and documented

## 🧱 Code Structure & Best Practices
### Frontend (Next.js with TypeScript and TailwindCSS v4)
- **Use Next.js App Router** for routing and layout management
- **Create reusable React components** in the appropriate feature directory
- **Implement custom hooks** for specialized logic (e.g., useSubtitleSync, useVideoUpload)
- **Apply TailwindCSS utility classes** for 90% of styling, with custom CSS only for complex animations
- **Ensure responsive design** for all UI components
- **Optimize for the specified Plyr video player integration** and subtitle synchronization
- **Follow the modern UI design guidance** inspired by "lipsync-2" with dark gray base, gradient accents, and improved typography

### Backend (Node.js with Express)
- **Implement the MVC pattern** with clear separation of concerns
- **Create specialized services** for key functionalities:
  - Video upload and storage
  - Subtitle generation using Gemini-flash-2.0
  - Subtitle alignment and timestamp correction
  - Format conversion (VTT to SRT, ASS)
- **Use middleware** for error handling, validation, and rate limiting
- **Implement streaming** for large file processing (up to 4GB)
- **Set up proper Redis queue management** for handling resource-intensive tasks
- **Configure Appwrite integrations** for database and storage needs

## 🛡️ Boundary Enforcement Framework
- **Clearly distinguish between frontend and backend responsibilities**:
  - Frontend: User interface, state management, client-side validation
  - Backend: Data processing, API integration, file management
- **Explicitly define integration points** between system components:
  - Next.js ↔ Express API: REST endpoints with typed requests/responses
  - Express API ↔ Appwrite: Storage and database operations only
  - Express API ↔ Vertex API: Subtitle generation workflows
- **Implement "stop and verify" checkpoints** before:
  - Suggesting architectural changes
  - Introducing new dependencies
  - Modifying established data flows
  - Implementing cross-boundary features
- **Document any boundary-crossing implementations** with explicit rationale

## 🧪 Testing & Error Handling
- **Implement comprehensive error handling** throughout the application, especially for:
  - Video processing operations (up to 4GB)
  - Gemini-flash-2.0 API interactions
  - File uploads and format conversions
  - Timestamp synchronization operations
- **Test with various video sizes and formats** to ensure robust processing
- **Implement graceful fallbacks** for all potential failure points
- **Log meaningful error messages** that help diagnose issues
- **Create unit, integration, and E2E tests** as specified in the coding standards
- **Pre-validate all potential error scenarios** using the following checklist:
  - File size limitations (especially for 4GB videos)
  - API timeouts and service unavailability
  - Memory constraints during processing
  - Edge cases in timestamp synchronization
  - Format conversion failures
  - Storage and database connection issues

## 📋 Progressive Implementation Protocol
- **Require completion of all prerequisite tasks** before starting a new task
- **Implement features in strict accordance** with the 7-phase roadmap:
  1. Project Setup and Initial Development
  2. Real-time Subtitle Preview and Synchronization
  3. Subtitle Export and Format Conversion
  4. UI/UX Enhancement and Optimization
  5. Backend Optimization and Redis Integration
  6. Testing, Bug Fixing, and Deployment Preparation
  7. Deployment and Monitoring
- **Validate completion of each phase** with the following gates:
  - All specified deliverables are complete
  - Tests pass for all implemented features
  - Documentation is updated
  - No critical bugs remain unresolved
- **Never skip development phases** or implement features out of sequence
- **Mark completed tasks in `tasks.md`** (to be created) after completion
- **Document implementation challenges** in `progress.md` (to be created)

## 🚦 Task Adherence Framework
- **Always consult `tasks.md`** before starting any implementation
- **Verify task dependencies are complete** before proceeding
- **Follow the exact task scope** without feature creep
- **Document completion criteria** for each task before starting
- **Update `progress.md` after each implementation** with:
  - Completed functionality
  - Challenges encountered
  - Solutions implemented
  - Next steps
- **Never work on multiple unrelated tasks simultaneously**
- **Prioritize tasks in the following order**:
  1. Critical path items from the current phase
  2. Dependency-blocking items for upcoming tasks
  3. Bug fixes for existing functionality
  4. Performance optimizations

## 📎 Style & Coding Standards
- **Follow the Single Responsibility Principle (SRP)** for all modules and components
- **Apply DRY, KISS, and YAGNI principles** as outlined in coding standards
- **Use TypeScript with strict mode** enabled for maximum type safety
- **Format code with ESLint and Prettier** according to project configurations
- **Apply TailwindCSS best practices** for consistent styling
- **Document code with JSDoc comments** for all functions
- **Run the following quality checks** before submitting any code:
  - TypeScript compilation with strict mode
  - ESLint without warnings
  - Test coverage for critical paths
  - Performance audit for large operations
  - Memory leak detection for long-running processes

## 🔍 Anti-Hallucination Measures
- **Always provide explicit documentation references** for key implementation decisions
- **Include citation to specific document and section** when making architectural recommendations
- **Verify all technology assumptions** before implementation:
  - "Confirm Plyr supports VTT subtitles with custom styling"
  - "Verify Gemini-flash-2.0 API endpoint specification"
  - "Check Redis Bull queue concurrency limits"
- **Apply the following confidence rating system**:
  - **High confidence**: Multiple credible sources confirm, documented in project specs
  - **Medium confidence**: Single credible source or inference from similar technologies
  - **Low confidence**: Educated guess or extrapolation requires further research
- **Flag speculation clearly** with "Speculation:" prefix
- **Never implement low-confidence recommendations** without further research
- **Distinguish clearly between established facts and suggestions**

## 📚 Implementation-Specific Guidelines
- **Video Processing & Storage**:
  - Efficiently handle videos up to 4GB using streaming approaches
  - Integrate properly with Appwrite Bucket Storage
  - Implement upload progress indicators and validation

- **Subtitle Generation with Gemini-flash-2.0**:
  - Optimize API interactions with the Vertex API
  - Ensure proper timestamp accuracy (±0.1 to ±3 seconds)
  - Implement retry mechanisms for API failures

- **Real-time Subtitle Preview**:
  - Integrate Plyr video player correctly
  - Use the `cuechange` event for dynamic subtitle synchronization
  - Ensure smooth real-time updates during playback

- **Timestamp Correction**:
  - Implement FFmpeg-based alignment tools
  - Account for the specified accuracy requirements
  - Create fallback mechanisms for timestamp discrepancies

- **Subtitle Export**:
  - Support the required formats (SRT, VTT, ASS)
  - Implement on-demand conversion from VTT
  - Ensure proper export handling for large files

- **Redis Task Management**:
  - Set up efficient queue systems for background processing
  - Implement worker threads for concurrent processing
  - Provide progress updates during long-running tasks

- **Modern UI Implementation**:
  - Follow the "lipsync-2" design inspiration
  - Implement specified UI elements (animated transitions, glowing drop zones)
  - Ensure responsive design for all screen sizes

## 📝 Documentation Integration System
- **Link all implementations** to corresponding documentation references
- **Update documentation progressively** as features are completed
- **Add explicit references** to related documentation sections in comments
- **Maintain a documentation trace** for all architectural decisions
- **Use standardized documentation templates** for:
  - Feature implementation summaries
  - API endpoint documentation
  - Component interface specifications
  - Error handling strategies
- **Create living documentation** that evolves with the project

## 🧠 Development Process Rules
- **Never assume missing context** - refer to the documentation or ask questions
- **Don't skip development phases** - follow the established roadmap
- **Test thoroughly** with various video sizes and formats before marking tasks complete
- **Document any deviations** from the project plan with clear rationale
- **Follow GitFlow-inspired branching strategy** with proper commit messages
- **Consider CI/CD integration** via GitHub Actions as specified

## ⚠️ Critical Implementation Considerations
- **Video size handling** is crucial - the system must efficiently process files up to 4GB
- **Timestamp accuracy** must meet the specified ±0.1 to ±3 seconds requirement
- **Real-time subtitle synchronization** must be smooth and accurate during playback
- **Format conversion** must work reliably across all supported formats
- **Redis integration** must effectively manage resource-intensive tasks
- **Performance optimization** is essential, especially for large video processing
- **Error handling** must be comprehensive and user-friendly
- **Perform a failure mode analysis** for each critical component:
  - Identify potential failure points
  - Define graceful degradation strategies
  - Implement user-friendly error messaging
  - Create recovery mechanisms where possible

## 📦 External Integrations Research
- **Verify Gemini-flash-2.0 integration** with the Vertex API
- **Research optimal FFmpeg-based alignment tools** for timestamp correction
- **Confirm Redis configuration best practices** for queue management
- **Validate Plyr video player integration** with VTT subtitles
- **Investigate optimal Appwrite configurations** for large file storage
- **Document all integration research** with:
  - Version compatibility information
  - Implementation best practices
  - Known limitations or issues
  - Alternative approaches if primary integration fails

## 🔄 Implementation Workflow
1. **Review project documentation** for context and requirements
2. **Consult `tasks.md`** for current priorities and dependencies
3. **MANDATORY: Conduct thorough web searches** for latest packages, libraries and implementation strategies
4. **Document research findings** with versions, best practices, and deprecated alternatives
5. **Create a detailed implementation plan** before coding
6. **Verify plan against boundary framework** and documentation
7. **Implement the feature** following all project standards
8. **Test thoroughly** across various scenarios
9. **Document the implementation** in code and progress tracking
10. **Update the progress.md and tasks.md files** accordingly
11. **Perform quality checks** before marking as complete

## 🚀 Future Considerations
- **Prepare architecture** for potential live subtitle generation using Gemini Live API
- **Design for scalability** as outlined in the project goals
- **Consider future enhancements** while building the foundation
- **Document areas for improvement** for future development phases