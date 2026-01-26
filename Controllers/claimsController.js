const Claims = require("../Models/claims.js")

exports.claim = async(req,res)=>{
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cd1230fe-8443-44b4-aab0-d1ea296bed31',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'claimsController.js:claim:entry',message:'claimsController.claim called',data:{hasBody:!!req.body,bodyKeys:req.body?Object.keys(req.body):[]},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    const {claim} = req.body
    if(!claim){
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd1230fe-8443-44b4-aab0-d1ea296bed31',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'claimsController.js:claim:validation',message:'claim missing in body',data:{claimType:typeof claim,isEmpty:!claim},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        return res.status(400).json({message: "Input Field is Required"})
    }
    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd1230fe-8443-44b4-aab0-d1ea296bed31',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'claimsController.js:claim:beforeCreate',message:'about to create Claims doc',data:{claimLen:typeof claim==='string'?claim.length:null,claimType:typeof claim},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        const claimDoc = new Claims({ claim })
        await claimDoc.save()

        res.status(200).json({message: "claim successfil"})
    } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cd1230fe-8443-44b4-aab0-d1ea296bed31',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'claimsController.js:claim:catch',message:'error in claimsController.claim',data:{errorMessage:error?.message||String(error),errorName:error?.name},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
        console.log(error)
        res.status(500).json({message:error.message})
    }
}

exports.remove = async(req,res)=>{
    const id = req.params.id

    try {
        const claim = await Claims.findById(id)
        if(!claim){
            return res.status(400).json({message: "claim not found"})
        }
        const deleteclaim = await Claims.findByIdAndDelete(id)
        res.status(200).json({message: "claim deleted  successfull"})
    } catch (error) {
         console.log(error)
        res.status(500).json({message:error.message})
    }
}