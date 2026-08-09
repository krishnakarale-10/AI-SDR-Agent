import { ApiError } from "../utils/apiErrors.js";

export const validation=(schema)=>(req,res,next)=>{
   //console.log("BODY:", req.body);  for testing if you want to look at how the imput is coming
   
    const result = schema.safeParse({
        body:req.body,
        query:req.query,
        params:req.params
    });
    if(!result.success){
    const message = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
    throw new ApiError(400, message);
    }
  if(result.data.body) req.body=result.data.body;
  if(result.data.query) req.query=result.data.query;
  if(result.data.params) req.params=result.data.params;
  next();
}