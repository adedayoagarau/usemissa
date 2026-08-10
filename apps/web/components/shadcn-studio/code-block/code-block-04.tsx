import { CodeBlock } from '@/components/ui/code-block'

const code = `import { Button } from "@/components/ui/button"

export default function Button() {
  return <Button size="outline">Shadcn/studio</Button>
}`

const CodeBlockCustomLine = () => {
  return <CodeBlock code={code} language='tsx' filename='button' highlightLines={[4]} showLineNumbers />
}

export default CodeBlockCustomLine
