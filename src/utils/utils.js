function generateOTP(){
    return Math.floor(10000+Math.random() *900000).toString()
}

function getOTPhtml(otp){
return `<!Doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OTP Verification</title>
</head> 
<body>
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 5px;">
        <h2 style="text-align: center;">OTP Verification</h2>
        <p style="text-align: center;">Your OTP for verification is:</p>
        <h1 style="text-align: center; color: #007bff;">${otp}</h1>
        <p style="text-align: center;">Please enter this OTP to complete your verification process.</p>
    </div>

</body>
</html>` 
}

export {generateOTP,getOTPhtml} 