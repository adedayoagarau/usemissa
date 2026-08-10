import { CodeBlock } from '@/components/ui/code-block'

const code = `import { Button } from "@/components/ui/button"

export default function MiniCard() {
  return (
    <Card className="w-60 p-4">
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Random</p>
        <Button onClick={() => alert(Math.random())}>
          Generate
        </Button>
      </CardContent>
    </Card>
  )
}`

const CodeBlockWithScroll = () => {
  return <CodeBlock code={code} language='tsx' filename='number-generator' showLineNumbers />
}

export default CodeBlockWithScroll
