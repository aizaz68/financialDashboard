'use server';
 import {z} from 'zod';
 import { sql } from '@vercel/postgres';
 import { revalidatePath } from 'next/cache';
 import {redirect} from 'next/navigation';
 import { signIn } from '@/auth';
 import { AuthError } from 'next-auth';





export async function authenticate(
  prevState:string|undefined,
  formData:FormData,

){

  try {
    await signIn('credentials',formData);
  } catch (error) {
    if(error instanceof AuthError){
      switch (error.type){
        case 'CredentialsSignin':
        return 'invalid SignIn';
        default: return 'Something went wrong'
      }
    }
    throw error;
  }
}


const FormSchema=z.object({
    id:z.string(),
    customerId:z.string({invalid_type_error:'Please select a Customer'}),
    amount:z.coerce.number().gt(0,{message:'please enter an amount greater than $0.'}),
    status:z.enum(['pending','paid'],{invalid_type_error:'Please select an Invoice status.'}),
    date:z.string(),    

});


export type State ={
  errors?:{
    customerId?:string[];
    amount?:string[];
    status?:string[]; 
  };
  message?:string|null;
}

const CreateInvoice=FormSchema.omit({id:true,date:true});


export async function createInvoice(preState:State,formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  if(!validatedFields.success){
    return {
      errors:validatedFields.error.flatten().fieldErrors,
      message:'Missing Field. Failed to create invoice.'
    }
  }
  const {customerId,status,amount}=validatedFields.data;


  const amountInCents=amount*100;
  const date=new Date().toISOString().split('T')[0];

  try {
    await sql`INSERT INTO invoices (customer_id,amount,status,date) VALUES (${customerId},${amountInCents},${status},${date})`;
    
  } catch (error) {
    return {message:'Datbase Error : Failed to Create Invoice'+error};
  }

 


  revalidatePath('/dashboard/invoices');
  
  redirect('/dashboard/invoices');
}


const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id:string ,preState:State,formData:FormData){
  const validatedFields =UpdateInvoice.safeParse({
    customerId:formData.get('customerId'),
    amount:formData.get('amount'),
    status:formData.get('status'),
  });


  if(!validatedFields.success){
    return {
      errors:validatedFields.error.flatten().fieldErrors,
      message:'Missing Field, Failed to Update Invoice'
    }
  }
     const {customerId,amount,status}=validatedFields.data;

  const amountInCents=amount*100;
try{
  await sql` UPDATE  invoices SET customer_id =${customerId} , amount =${amountInCents} ,status=${status} WHERE id=${id}`;
}
catch(error){
  return {message:'Database Error :Error  While Updating Invoice '+error}

} 
  revalidatePath('/dashboard/invoices');
   redirect('/dashboard/invoices');


}


export async function deleteInvoice(id: string) {
  try{
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}catch(error){
  return {message:'Database Error : error while deleting Invoice'+error}
}

  
}

