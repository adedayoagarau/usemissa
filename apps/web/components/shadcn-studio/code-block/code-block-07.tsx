import { CodeBlock } from '@/components/ui/code-block'

const pnpm = `pnpm dlx shadcn@latest add @ss-components/code-block-07`
const npm = `npx shadcn@latest add @ss-components/code-block-07`
const yarn = `yarn shadcn@latest add @ss-components/code-block-07`
const bun = `bunx --bun shadcn@latest add @ss-components/code-block-07`

const CodeBlockMultipleTabs = () => {
  return (
    <CodeBlock
      className='w-full max-w-xl'
      files={[
        { filename: 'pnpm', code: pnpm, language: 'bash' },
        { filename: 'npm', code: npm, language: 'bash' },
        { filename: 'yarn', code: yarn, language: 'bash' },
        { filename: 'bun', code: bun, language: 'bash' }
      ]}
    />
  )
}

export default CodeBlockMultipleTabs
