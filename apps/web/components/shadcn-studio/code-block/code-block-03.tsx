import { CodeBlock } from '@/components/ui/code-block'

const code = `import { Button } from "@/components/ui/button"

export default function Button() {
  return <Button size="sm">Shadcn/ui</Button>
}`

const CodeBlockCustomBg = () => {
  return <CodeBlock code={code} language='tsx' filename='button' panelClassName='bg-primary/20' showLineNumbers />
}

export default CodeBlockCustomBg
