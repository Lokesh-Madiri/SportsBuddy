# Contributing to SportsBuddy

Thank you for your interest in contributing to SportsBuddy! To ensure a smooth development process and maintain high code quality, please follow the guidelines below.

---

## 🛠 Setup & Development Workflow

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/nsky26/SportsBuddy.git
   cd SportsBuddy
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Start the Development Server**:
   ```bash
   npm start
   ```

---

## 🧪 Code Quality & Testing

To maintain consistency and prevent bugs across the codebase, **we enforce strict code quality checks**.

### ESLint Configuration
* **Do not ignore or delete the ESLint configuration**: The `eslint.config.js` file is version-controlled and pushed to the remote repository. This ensures that every developer and the CI/CD environment runs the exact same checks.
* **Running the Linter**: Before committing your changes, make sure to run:
  ```bash
  npm run lint
  ```
  All errors must be resolved, and warnings should be kept to a minimum.

### TypeScript Type-Checking
* All code in the `src/` directory should be type-safe. Run the type-checker before opening a pull request:
  ```bash
  npm run typecheck
  ```
  Your code must compile without type errors.

### Unit & Component Testing (Jest)
* The project uses [Jest](https://jestjs.io/) with [jest-expo](https://github.com/expo/expo/tree/main/packages/jest-expo) and [@testing-library/react-native](https://callstack.github.io/react-native-testing-library/) for unit and component testing.
* **Test files** follow these naming conventions and live alongside the files they test:
  - `src/utils/helpers.test.ts` → unit tests for utility functions
  - `src/components/common/Badge.test.tsx` → component tests for `Badge`
* **Running tests**: Run the full test suite with:
  ```bash
  npm run test
  ```
* **Watch mode**: While developing, run tests in watch mode for instant feedback:
  ```bash
  npm run test:watch
  ```
* **Coverage**: All new utility functions and shared components should have accompanying unit or component tests. Pull requests that add features without tests will be asked to add coverage before merging.

---

## 🚀 Pull Request Guidelines

1. **Create a Branch**: Always create a feature or bugfix branch off of the main branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Commit Changes**: Make clear, atomic commits with descriptive commit messages.
3. **Run Local Verifications**:
   - Ensure the app starts and runs without runtime crashes.
   - Run `npm run lint` and `npm run typecheck` to verify code quality.
4. **Submit a PR**: Open a Pull Request on GitHub against the main branch. Explain your changes and link any related issues.
