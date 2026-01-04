import { NextRequest, NextResponse } from "next/server";

/**
 * API route to send notifications (email/SMS)
 * 
 * This is a placeholder that logs the notification.
 * To actually send emails/SMS, integrate with:
 * - Email: Resend, SendGrid, AWS SES, etc.
 * - SMS: Twilio, AWS SNS, etc.
 */
export async function POST(request: NextRequest) {
  // Set response headers early to ensure JSON
  const jsonHeaders = {
    'Content-Type': 'application/json',
  };

  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[notifications/send] JSON parse error:", parseError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400, headers: jsonHeaders }
      );
    }

    const { email, phone, emailSubject, emailBody, smsBody } = body;

    // Validate required fields
    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: "Email or phone is required" },
        { 
          status: 400,
          headers: jsonHeaders
        }
      );
    }

    // Log the notification (for now)
    console.log("[notifications/send] Notification request:", {
      email,
      phone,
      emailSubject,
      emailBodyLength: emailBody?.length || 0,
      smsBodyLength: smsBody?.length || 0,
    });

    // Send email if Resend is configured
    if (email) {
      const resendApiKey = process.env.RESEND_API_KEY;
      
      if (resendApiKey) {
        try {
          // Dynamic import to avoid errors if package isn't installed
          const { Resend } = await import('resend');
          const resend = new Resend(resendApiKey);
          
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
          
          console.log(`[notifications/send] Attempting to send email via Resend:`, {
            from: fromEmail,
            to: email,
            subject: emailSubject,
            bodyLength: emailBody?.length || 0,
          });
          
          const result = await resend.emails.send({
            from: fromEmail,
            to: email,
            subject: emailSubject || 'Event Assignment',
            html: emailBody || '<p>No email body provided</p>',
          });
          
          console.log(`[notifications/send] Email sent successfully to: ${email}`, result);
        } catch (resendError: any) {
          console.error("[notifications/send] Resend error:", {
            message: resendError?.message,
            name: resendError?.name,
            stack: resendError?.stack?.substring(0, 200),
          });
          // Return error but still return JSON
          return NextResponse.json(
            {
              success: false,
              error: `Failed to send email: ${resendError?.message || 'Unknown Resend error'}`,
            },
            { status: 500, headers: jsonHeaders }
          );
        }
      } else {
        console.log(`[notifications/send] Resend not configured - logging email instead:`);
        console.log(`[notifications/send] To: ${email}`);
        console.log(`[notifications/send] Subject: ${emailSubject}`);
        console.log(`[notifications/send] Body preview: ${emailBody?.substring(0, 200)}...`);
      }
    }

    // TODO: Integrate with SMS service (Twilio, etc.)
    if (phone) {
      // Example with Twilio (uncomment and configure):
      /*
      const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: smsBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      */
      console.log(`[notifications/send] Would send SMS to: ${phone}`);
      console.log(`[notifications/send] Message: ${smsBody}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Notification processed successfully",
      },
      {
        status: 200,
        headers: jsonHeaders
      }
    );
  } catch (error: any) {
    console.error("[notifications/send] Unexpected error:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500),
    });
    
    // Always return JSON, never HTML
    // Use Response constructor to ensure JSON
    try {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to send notification",
          details: process.env.NODE_ENV === 'development' ? error?.stack?.substring(0, 500) : undefined,
        },
        { 
          status: 500,
          headers: jsonHeaders
        }
      );
    } catch (jsonError) {
      // Fallback if JSON.stringify fails
      console.error("[notifications/send] Failed to create JSON response:", jsonError);
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Internal server error",
        }),
        {
          status: 500,
          headers: jsonHeaders
        }
      );
    }
  }
}

