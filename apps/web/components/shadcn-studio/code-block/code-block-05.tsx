import { CodeBlock } from '@/components/ui/code-block'

const AvatarCode = `import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AvatarComponent() {
  return (
    <Avatar>
      <AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png' alt='Hallie Richards' />
      <AvatarFallback className='text-xs'>HR</AvatarFallback>
    </Avatar>
  )
}`

const ButtonCode = `import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ButtonIconHoverDemo() {
  return (
    <Button className='group'>
      Get In Touch
      <ArrowRightIcon className='transition-transform duration-200 group-hover:translate-x-0.5' />
    </Button>
  )
}`

const CodeBlockTabs = () => {
  return (
    <CodeBlock
      className='w-full max-w-xl'
      files={[
        { filename: 'avatar.tsx', code: AvatarCode, language: 'tsx', showLineNumbers: true },
        { filename: 'button.tsx', code: ButtonCode, language: 'tsx', showLineNumbers: true }
      ]}
    />
  )
}

export default CodeBlockTabs
