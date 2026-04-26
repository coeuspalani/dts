import nodemailer from 'nodemailer'
import PDFDocument from 'pdfkit'

const mailHost = process.env.MAIL_SERVER
const mailPort = Number(process.env.MAIL_PORT || 587)
const mailUser = process.env.MAIL_USERNAME
const mailPass = process.env.MAIL_PASSWORD
const mailUseTls = process.env.MAIL_USE_TLS?.toLowerCase() === 'true'
const mailFrom = process.env.MAIL_FROM || mailUser

if (!mailHost || !mailUser || !mailPass) {
  console.warn('Mail configuration is incomplete. Certificate emails will not be sent.')
}

const transporter = nodemailer.createTransport({
  host: mailHost,
  port: mailPort,
  secure: mailUseTls,
  auth: {
    user: mailUser,
    pass: mailPass,
  },
})

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export function isMailConfigured() {
  return Boolean(mailHost && mailUser && mailPass)
}

export async function generateCertificatePdf(options: {
  recipientName: string
  challengeTitle: string
  challengeDate: string
  rank: number
  points: number
  solves: number
}) {
  const { recipientName, challengeTitle, challengeDate, rank, points, solves } = options
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  doc.font('Helvetica-Bold').fontSize(28).fillColor('#0f172a').text('Certificate of Achievement', { align: 'center' })
  doc.moveDown(0.5)
  doc.font('Helvetica').fontSize(12).fillColor('#475569').text('Presented to', { align: 'center' })
  doc.moveDown(0.2)
  doc.font('Helvetica-Bold').fontSize(24).fillColor('#111827').text(recipientName, { align: 'center' })
  doc.moveDown(0.5)
  doc.font('Helvetica').fontSize(12).fillColor('#475569').text(`For outstanding performance in the ${challengeTitle} challenge`, {
    align: 'center',
    lineGap: 4,
  })
  doc.moveDown(1.2)

  const boxTop = doc.y
  doc.save()
  doc.roundedRect(72, boxTop, doc.page.width - 144, 140, 16).fillOpacity(0.05).fill('#0f172a').restore()
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Challenge', 90, boxTop + 18)
  doc.font('Helvetica').fontSize(14).text(challengeTitle, 90, boxTop + 34)
  doc.font('Helvetica-Bold').fontSize(12).text('Rank', 90, boxTop + 70)
  doc.font('Helvetica').fontSize(14).text(`#${rank}`, 90, boxTop + 86)
  doc.font('Helvetica-Bold').fontSize(12).text('Points', 280, boxTop + 18)
  doc.font('Helvetica').fontSize(14).text(`${points}`, 280, boxTop + 34)
  doc.font('Helvetica-Bold').fontSize(12).text('Solved', 280, boxTop + 70)
  doc.font('Helvetica').fontSize(14).text(`${solves} problems`, 280, boxTop + 86)
  doc.font('Helvetica-Bold').fontSize(12).text('Date', 470, boxTop + 18)
  doc.font('Helvetica').fontSize(14).text(challengeDate, 470, boxTop + 34)
  doc.moveDown(8)

  doc.font('Helvetica').fontSize(11).fillColor('#475569').text(
    `This certificate is awarded in recognition of exceptional effort, strategic problem solving, and dedication throughout the challenge. Congratulations on your achievement!`,
    {
      align: 'center',
      lineGap: 4,
    }
  )

  doc.moveDown(5)
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111827').text('Retre Platform', { align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('Certification generated automatically by the Retre challenge platform.', {
    align: 'center',
  })

  doc.end()
  return await streamToBuffer(doc)
}

export async function sendChallengeCertificateEmail(options: {
  to: string
  name: string
  challengeTitle: string
  rank: number
  points: number
  solves: number
  challengeDate: string
}) {
  if (!isMailConfigured()) {
    throw new Error('Mail server is not configured')
  }

  const { to, name, challengeTitle, rank, points, solves, challengeDate } = options
  const pdf = await generateCertificatePdf({ recipientName: name, challengeTitle, challengeDate, rank, points, solves })
  const subject = `Certificate for ${challengeTitle} — Rank #${rank}`
  const html = `
    <div style="font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.6;">
      <div style="max-width: 680px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 24px;">
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #111827;">Congratulations, ${name}!</h1>
        <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">You have successfully completed the <strong>${challengeTitle}</strong> challenge. Your final ranking is <strong>#${rank}</strong>, and you earned <strong>${points}</strong> points from <strong>${solves}</strong> solves.</p>
        <div style="padding: 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Challenge:</strong> ${challengeTitle}</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;"><strong>Date:</strong> ${challengeDate}</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;"><strong>Rank:</strong> #${rank}</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;"><strong>Points:</strong> ${points}</p>
        </div>
        <p style="font-size: 16px; color: #334155; margin-bottom: 24px;">Your certificate is attached as a PDF for your records and professional sharing.</p>
        <a href="https://your-app.vercel.app" style="display: inline-flex; align-items: center; justify-content: center; padding: 12px 20px; background: #2563eb; color: #ffffff; border-radius: 12px; text-decoration: none; font-weight: 600;">View your Retre dashboard</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">This email was generated automatically by Retre Platform.</p>
    </div>
  `

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    html,
    attachments: [
      {
        filename: `${challengeTitle.replace(/[^a-z0-9]/gi, '_').slice(0, 32)}_certificate.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  })
}
