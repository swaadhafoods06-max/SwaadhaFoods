import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const headers={'Cache-Control':'private, no-store'};
 const authorization=request.headers.get('authorization');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return NextResponse.json({error:'Service unavailable.'},{status:503,headers});
 if(!authorization?.startsWith('Bearer '))return NextResponse.json({error:'Please sign in.'},{status:401,headers});
 const client=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await client.auth.getUser(authorization.slice(7));
 if(error||!user)return NextResponse.json({error:'Please sign in.'},{status:401,headers});
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'Order not found.'},{status:404,headers});
 // RLS limits this query to the customer who placed the order or authorised order staff.
 const {data:order}=await client.from('orders').select('id,customer_id,customer_name,requested_date').eq('id',id).maybeSingle();
 if(!order)return NextResponse.json({error:'Order not found.'},{status:404,headers});
 if(order.customer_id!==user.id){const {data:allowed}=await client.rpc('has_tab',{tab_name:'orders'});if(!allowed)return NextResponse.json({error:'Access denied.'},{status:403,headers});}
 return NextResponse.json({address:'429, 9th B Main Road, HRBR Layout 1st Block, Kalyannagar, Bangalore 560043',name:order.customer_name,orderNumber:order.id.slice(0,8).toUpperCase(),date:order.requested_date},{headers});
}
