import React, { ReactNode } from 'react'

export default function SubjectLayout ({ children }: { children: ReactNode }) {
  return (
    <div className='overflow-y-auto'>
        {children}
    </div>
  )
}