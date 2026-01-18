// purchase.cron.ts
import cron from 'node-cron';
import { Org } from '../org/org.model';
import { purchaseService } from './purchase.service';

interface RenewalResult {
  success: number;
  failures: number;
  details: {
    success: string[];
    failures: Array<{ orgName: string; error: string }>;
  };
}

export const setupPurchaseRenewalCron = (): void => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Starting automatic subscription renewal cron job...');
    const startTime = Date.now();
    
    const result: RenewalResult = {
      success: 0,
      failures: 0,
      details: {
        success: [],
        failures: []
      }
    };

    try {
      // Find organizations due for renewal (nextBillingDate is today or in past)
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      const dueOrgs = await Org.find({
        nextBillingDate: { $lte: today },
        status: 'ACTIVE',
        'billingInfo.paymentMethodId': { $exists: true, $ne: null },
        stripeCustomerId: { $exists: true, $ne: null }
      }).populate('plan');

      console.log(`📊 Found ${dueOrgs.length} organizations due for renewal`);

      if (dueOrgs.length === 0) {
        console.log('✅ No organizations due for renewal today');
        return;
      }

      // Process each organization sequentially to avoid rate limits
      for (const org of dueOrgs) {
        try {
          console.log(`🔄 Processing renewal for: ${org.orgName} (${org._id})`);

          const planDoc: any = org.plan;

          if (planDoc?.isTrial && planDoc?.postTrialPlan) {
            await purchaseService.handleChangePlan({
              orgId: org._id.toString(),
              planId: planDoc.postTrialPlan.toString(),
              billingInfo: {
                paymentMethodId: org.billingInfo?.paymentMethodId as string,
              },
            }, {
              userId: 'system-cron',
              name: 'Trial Auto-Conversion'
            } as any);
            console.log(`🔁 Converted trial plan to paid plan for: ${org.orgName}`);
          } else {
            await purchaseService.handlePurchaseRenewal(org._id.toString(), {
              userId: 'system-cron',
              name: 'Automatic Renewal System'
            } as any);
            console.log(`✅ Successfully renewed plan for: ${org.orgName}`);
          }

          result.success++;
          result.details.success.push(org.orgName);

          // Small delay to avoid hitting Stripe rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          result.failures++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.details.failures.push({
            orgName: org.orgName,
            error: errorMessage
          });
          
          console.error(`❌ Failed to renew plan for: ${org.orgName}`, errorMessage);
        }
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // Log overall cron job result
      const summaryMessage = `Renewal cron completed: ${result.success} successful, ${result.failures} failed. Duration: ${duration}s`;
      console.log(`📈 ${summaryMessage}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Cron job failed completely:', error);
    
    }
  });

  console.log('✅ Automatic subscription renewal cron job scheduled (daily at 2:00 AM)');
};

// Manual trigger for testing
export const manualPurchaseRenewalTrigger = async (): Promise<RenewalResult> => {
  console.log('🔧 Manual renewal trigger activated...');
  const result: RenewalResult = {
    success: 0,
    failures: 0,
    details: {
      success: [],
      failures: []
    }
  };

  try {
    const dueOrgs = await Org.find({
      nextBillingDate: { $lte: new Date() },
      status: 'ACTIVE',
      'billingInfo.paymentMethodId': { $exists: true, $ne: null },
      stripeCustomerId: { $exists: true, $ne: null }
    }).populate('plan');

    console.log(`📊 Found ${dueOrgs.length} organizations due for renewal`);

    for (const org of dueOrgs) {
      try {
        await purchaseService.handlePurchaseRenewal(org._id.toString(), {
          userId: 'manual-trigger',
          name: 'Manual Renewal'
        } as any);

        result.success++;
        result.details.success.push(org.orgName);
        console.log(`✅ Successfully renewed: ${org.orgName}`);
      } catch (error) {
        result.failures++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.details.failures.push({ orgName: org.orgName, error: errorMessage });
        console.error(`❌ Failed to renew: ${org.orgName}`, errorMessage);
      }
    }

    return result;
  } catch (error) {
    console.error('💥 Manual renewal failed:', error);
    throw error;
  }
};