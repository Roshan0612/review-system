import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Your experience, in your words | The Brand Store',description:'Share your honest shopping experience at The Brand Store, Virar. A few thoughtful taps. A review that sounds like you.',robots:{index:false,follow:false},icons:{icon:'/icon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
