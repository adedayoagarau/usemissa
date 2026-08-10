import type { BundledLanguage } from 'shiki'

import { CodeBlock } from '@/components/ui/code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const tabs: { label: string; value: string; filename: string; language: BundledLanguage; code: string }[] = [
  {
    label: 'JavaScript',
    value: 'js',
    filename: 'todo-list',
    language: 'javascript',
    code: `class TodoList {
  constructor() {
    this.todos = [];
  }

  add(task) {
    this.todos.push({ task, done: false });
  }

  toggle(index) {
    if (this.todos[index]) {
      this.todos[index].done = !this.todos[index].done;
    }
  }

  list() {
    return this.todos;
  }
}

const myTodos = new TodoList();
myTodos.add("Build code block component");
myTodos.add("Style it nicely");
myTodos.toggle(0);

console.log(myTodos.list());`
  },
  {
    label: 'Python',
    value: 'py',
    filename: 'dice-roll',
    language: 'python' as BundledLanguage,
    code: `import random
from datetime import datetime

def roll_dice(times=5):
    results = [random.randint(1, 6) for _ in range(times)]
    return results, sum(results)

rolls, total = roll_dice(4)

print("Rolls:", rolls)
print("Total:", total)
print("Timestamp:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))`
  },
  {
    label: 'React',
    value: 'tsx',
    filename: 'counter-card',
    language: 'tsx' as BundledLanguage,
    code: `import { useState } from "react";

export default function CounterCard() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(prev => prev + 1);
  const decrement = () => setCount(prev => prev - 1);

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h2>Simple Counter</h2>
      <p style={{ fontSize: 24 }}>{count}</p>
      <button onClick={decrement}>-</button>
      <button onClick={increment} style={{ marginLeft: 10 }}>+</button>
    </div>
  );
}`
  }
]

const CodeBlockTabs = () => {
  return (
    <Tabs defaultValue='js' className='w-full max-w-xl'>
      <TabsList className='w-full justify-start'>
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value}>
          <CodeBlock
            files={[
              {
                filename: `${tab.filename}.${tab.value}`,
                code: tab.code,
                language: tab.language,
                showLineNumbers: true
              }
            ]}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

export default CodeBlockTabs
