import { z } from 'zod';
export const positiveOptions = ['Premium quality','Comfortable fit','Value for money','Helpful staff','Stylish collection','Soft fabric','Neat stitching','Great colours','Easy shopping','Quick service'] as const;
export const negativeOptions = ["Didn't find my size",'Limited choices'] as const;
export const options = [...positiveOptions,...negativeOptions];
export const productOptions = ['Shirt','T-shirt','Pants/Jeans','Track pants','Belt','Wallet','Perfume','Other'] as const;
export const MAX_SELECTIONS=6;
export const inputSchema=z.object({
 products:z.array(z.enum(productOptions)).max(productOptions.length).default([]),
 selected:z.array(z.enum(options as [string,...string[]])).max(MAX_SELECTIONS),
 notes:z.string().trim().max(500).default(''),
 language:z.enum(['English','Hindi','Marathi']),
 previous:z.string().max(2000).optional()
}).strict().superRefine((data,ctx)=>{
 if(new Set(data.selected).size!==data.selected.length)ctx.addIssue({code:'custom',message:'Select each experience only once.'});
 if(new Set(data.products).size!==data.products.length)ctx.addIssue({code:'custom',message:'Select each product only once.'});
 if(!data.selected.length)ctx.addIssue({code:'custom',message:'Select at least one experience that applies to you.'});
});
export const googleReviewUrl='https://search.google.com/local/writereview?placeid=ChIJx9ySLgCr5zsRkc6s6Nbdd2g';
