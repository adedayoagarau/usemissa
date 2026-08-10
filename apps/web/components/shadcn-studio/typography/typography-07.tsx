const TypographyTableDemo = () => {
  return (
    <div className='my-6 w-full max-w-xl overflow-y-auto'>
      <table className='w-full'>
        <thead>
          <tr className='even:bg-muted border-t p-0'>
            <th className='border px-4 py-2 text-left font-semibold'>Royal Ledger</th>
            <th className='border px-4 py-2 text-left font-semibold'>Public Joy Index</th>
          </tr>
        </thead>
        <tbody>
          <tr className='even:bg-muted border-t p-0'>
            <td className='border px-4 py-2 text-left'>Scarce</td>
            <td className='border px-4 py-2 text-left'>Rising</td>
          </tr>
          <tr className='even:bg-muted border-t p-0'>
            <td className='border px-4 py-2 text-left'>Moderate</td>
            <td className='border px-4 py-2 text-left'>Content</td>
          </tr>
          <tr className='even:bg-muted border-t p-0'>
            <td className='border px-4 py-2 text-left'>Plentiful</td>
            <td className='border px-4 py-2 text-left'>Joyful</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default TypographyTableDemo
