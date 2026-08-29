import { promise } from "zod";
import prisma from "../../../config/prisma";
import { ApiError } from "../../../utils/apiErrors.js";


 const loadContext = async(state)=>{
   const  {campaignId,leadId } = state;

   const {campaign,lead} = await Promise.all([
    prisma.campaign.findUnique({where:{id:campaignId}}),
    prisma.lead.findUnique({where:{id:leadId}})
   ]);

   if(!campaign){
    throw new ApiError("Campaign Not Found",404,"campaign_not_found");
   }
   if(!lead){
    throw new ApiError("Lead Not Found",404,"lead_not_found");
   }
    if (lead.campaign_id !== campaign.id) {
    throw new ApiError(400, "Lead does not belong to this campaign");
  }

   return {
    campaign,
    lead,
    status: "PROCESSING",
   }
};

export default loadContext;
