import { createHmac } from 'node:crypto';
export async function reserveGeneration(ip:string){
 const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN,salt=process.env.RATE_LIMIT_SALT;
 if(!url||!token||!salt)throw new Error('LIMITS_UNAVAILABLE');
 const day=new Date().toISOString().slice(0,10),hash=createHmac('sha256',salt).update(ip).digest('hex');
 const number=(v:string|undefined,d:number)=>{const n=Number(v);return Number.isInteger(n)&&n>0?Math.min(n,10000):d;};
 const script="local a=tonumber(redis.call('GET',KEYS[1]) or '0'); local b=tonumber(redis.call('GET',KEYS[2]) or '0'); if a>=tonumber(ARGV[1]) or b>=tonumber(ARGV[2]) then return 0 end; redis.call('INCR',KEYS[1]); redis.call('INCR',KEYS[2]); redis.call('EXPIRE',KEYS[1],172800); redis.call('EXPIRE',KEYS[2],172800); return 1";
 const res=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,'2',`reviews:global:${day}`,`reviews:ip:${day}:${hash}`,String(number(process.env.AI_DAILY_LIMIT,100)),String(number(process.env.AI_PER_IP_DAILY_LIMIT,10))]),signal:AbortSignal.timeout(5000),cache:'no-store'});
 if(!res.ok)throw new Error('LIMITS_UNAVAILABLE');
 const data=await res.json();if(data.error||![0,1].includes(data.result))throw new Error('LIMITS_UNAVAILABLE');return data.result===1;
}
