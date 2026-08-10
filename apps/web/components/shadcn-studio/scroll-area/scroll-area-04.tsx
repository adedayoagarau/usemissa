import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const ScrollAreaDemo = () => {
  const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'Status', 'Join Date', 'Salary', 'Location', 'Manager']

  const data = Array.from({ length: 25 }, (_, i) => [
    i + 1,
    `Employee ${i + 1}`,
    `employee${i + 1}@company.com`,
    ['Developer', 'Designer', 'Manager', 'Analyst', 'QA'][i % 5],
    ['Engineering', 'Design', 'Sales', 'HR', 'Finance'][i % 5],
    ['Active', 'Inactive'][i % 2],
    `202${Math.floor(i / 10)}-0${(i % 12) + 1}-15`,
    `$${50000 + i * 1000}`,
    ['New York', 'London', 'Tokyo', 'Berlin', 'Sydney'][i % 5],
    `Manager ${Math.floor(i / 5) + 1}`
  ])

  return (
    <div className='rounded-md border'>
      <ScrollArea className='h-70 w-xs sm:w-100'>
        <div className='m-1 w-max min-w-full px-4 py-2'>
          <h4 className='mb-4 text-sm font-medium'>Employee Data Table</h4>
          <div className='w-max min-w-full overflow-hidden rounded-md border'>
            <table className='w-max min-w-full text-xs'>
              <thead className='bg-muted'>
                <tr>
                  {headers.map((header, i) => (
                    <th key={i} className='border-r p-4 px-2 text-left font-medium last:border-r-0'>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className='border-t'>
                    {row.map((cell, j) => (
                      <td key={j} className='border-r p-4 px-2 text-nowrap last:border-r-0'>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  )
}

export default ScrollAreaDemo
