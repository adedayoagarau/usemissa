const ListUsers = () => {
  return (
    <div className='flex flex-col items-center space-y-4'>
      <div className='w-full space-y-4'>
        <div className='px-4 sm:px-0'>
          <h3 className='text-2xl font-semibold'>Product Information</h3>
          <p className='max-w-full'>Details of the latest product release.</p>
        </div>
        <div className='mt-6 border-t'>
          <dl className='divide-y'>
            <div className='px-4 py-6 text-base sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0'>
              <dt className='font-medium'>Product Name</dt>
              <dd className='sm:col-span-2 sm:mt-0'>Shadcn Studio</dd>
            </div>
            <div className='px-4 py-6 text-base sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0'>
              <dt className='font-medium'>Category</dt>
              <dd className='sm:col-span-2 sm:mt-0'>Shadcn UI Components, Blocks & Template</dd>
            </div>
            <div className='px-4 py-6 text-base sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0'>
              <dt className='font-medium'>Price</dt>
              <dd className='sm:col-span-2 sm:mt-0'>$499</dd>
            </div>
            <div className='px-4 py-6 text-base sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0'>
              <dt className='font-medium'>Description</dt>
              <dd className='sm:col-span-2 sm:mt-0'>
                The <span className='font-semibold'>Shadcn Studio</span> is the most developer friendly & highly
                customizable components, blocks & templates based on Shadcn UI.
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <p className='text-muted-foreground text-xs'>
        Inspired by{' '}
        <a
          className='hover:text-foreground underline'
          href='https://flyonui.com/docs/content/list/#description-list-example'
          target='_blank'
          rel='noopener noreferrer'
        >
          FlyonUI
        </a>
      </p>
    </div>
  )
}

export default ListUsers
