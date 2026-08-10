import { CodeBlock } from '@/components/ui/code-block'

const code = `import { Button } from "@/components/ui/button"

export function MyComponent() {
  return <Button>Click me</Button>
}`

const CodeBlockDemo = () => {
  return <CodeBlock code={code} language='tsx' />
}

export default CodeBlockDemo
