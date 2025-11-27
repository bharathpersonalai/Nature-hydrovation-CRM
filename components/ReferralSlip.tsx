import React from 'react';

interface ReferralSlipProps {
    referralId: string;
    referrerName: string;
    date: string;
    rewardAmount: number;
    backgroundUrl: string | null;
    referralCode?: string;
}

const ReferralSlip: React.FC<ReferralSlipProps> = ({ referrerName, backgroundUrl, referralCode }) => {
    // A default background is provided if none is uploaded by the user.
    const defaultBackground = 'https://images.unsplash.com/photo-1599227302364-282c6328902c?q=80&w=1887&auto=format&fit=crop';
    
    return (
        <div className="bg-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row text-white font-sans">
            {/* Left side with image */}
            <div className="md:w-[35%] relative flex-shrink-0">
                <div 
                    className="absolute inset-0 bg-cover bg-center rounded-l-lg" 
                    style={{ backgroundImage: `url(${backgroundUrl || defaultBackground})` }}
                ></div>
                <div className="absolute inset-0 bg-black/60 rounded-l-lg"></div>
                <div className="relative z-10 flex flex-col justify-end h-full p-6 text-center min-h-[200px] md:min-h-0">
                    <p className="text-lg font-medium">Thank you for your trust</p>
                </div>
            </div>

            {/* Right side with details */}
            <div className="flex-grow p-6 md:p-8 flex flex-col justify-center">
                <h3 className="text-sm font-bold uppercase text-sky-400 tracking-wider">Referral Reward</h3>
                <p className="mt-2 text-sm text-slate-400">Presented To:</p>
                <h1 className="text-4xl font-extrabold text-white leading-tight">{referrerName}</h1>
                <p className="mt-1 text-slate-300">With appreciation for your purchase.</p>

                <div className="mt-4">
                    <p className="text-sm text-slate-300 italic">
Share your referral code with friends and family!
When they purchase a water purifier or any product worth ₹10,000 or more using your code, they will get an instant ₹500 discount on their billing.
And once their purchase is completed, YOU also earn ₹500 as a referral reward.
Unlimited referrer! Unlimited Earnings! No time limit! Share everywhere on your Social Media!</p>  
                    <hr className="border-t-2 border-dashed border-sky-500/30 my-3" />
                </div>
                {referralCode && (
                     <div className="mt-2 text-center">
                        <div className="inline-block bg-slate-700 border-2 border-dashed border-sky-400 rounded-lg px-6 py-2">
                            <code className="text-2xl font-bold text-sky-300 tracking-widest">{referralCode}</code>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReferralSlip;