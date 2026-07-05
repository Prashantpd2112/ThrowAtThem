// Type declarations for CSS imports
// Allows TypeScript to understand `import "./globals.css"` side-effect imports

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
