import { z } from 'zod';
export const positiveOptions = ['Premium quality','Comfortable fit','Value for money','Helpful staff','Stylish collection','Soft fabric','Neat stitching','Great colours','Easy shopping','Quick service'] as const;
export const negativeOptions = ["Didn't find my size",'Limited choices'] as const;
export const options = [...positiveOptions,...negativeOptions];
export const MAX_SELECTIONS=6;
export const phrases:Record<string,string> = {
 'Premium quality':'The quality felt premium.', 'Comfortable fit':'The fit was comfortable.', 'Value for money':'It felt like good value for money.', 'Helpful staff':'The staff were helpful.', 'Stylish collection':'The collection was stylish.', 'Soft fabric':'The fabric felt soft.', 'Neat stitching':'The stitching was neat.', 'Great colours':'I liked the colours.', 'Easy shopping':'Shopping was straightforward.', 'Quick service':'The service was quick.', "Didn't find my size":"I couldn't find my size.", 'Limited choices':'I found the choices limited.'
};
export const inputSchema=z.object({selected:z.array(z.enum(options as [string,...string[]])).max(MAX_SELECTIONS),notes:z.string().trim().max(500),language:z.enum(['English','Hindi','Marathi']),previous:z.string().max(2000).optional()}).strict().superRefine((data,ctx)=>{
 if(new Set(data.selected).size!==data.selected.length)ctx.addIssue({code:'custom',message:'Select each experience only once.'});
 if(!data.selected.length&&!data.notes)ctx.addIssue({code:'custom',message:'Choose an experience or add a note first.'});
});
export function basicDraft(selected:string[],notes:string){return [...selected.map(s=>phrases[s]).filter(Boolean),notes.trim()].filter(Boolean).join(' ');}
export const googleReviewUrl=process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL||'https://www.google.com/search?q=the+brand+store+virar#lrd=0x3be7ab002e92dcc7:0x6877ddd6e8acce91,3,,,,';
