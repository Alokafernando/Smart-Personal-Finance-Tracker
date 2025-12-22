import nodemailer from "nodemailer"

export const sendEmail = async (to: string, subject: string, text: string) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Smart Finance App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    })

    // console.log(`Email sent to ${to}`)
  } catch (err) {
    console.error("Failed to send email:", err)
  }
}
