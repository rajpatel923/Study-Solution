const DashboardCTA = () => {
    return (
        <div className="relative w-full overflow-hidden rounded-[40px] bg-blue-600 p-6 sm:p-10 md:p-20">
            <div className="absolute inset-0 hidden h-full w-full overflow-hidden md:block">
                <div className="absolute top-1/2 right-[-20%] aspect-square h-[800px] w-[800px] -translate-y-1/2">
                    <div className="absolute inset-0 rounded-full bg-blue-500 opacity-30"></div>
                    <div className="absolute inset-0 scale-[0.9] rounded-full bg-blue-400 opacity-30"></div>
                    <div className="absolute inset-0 scale-[0.8] rounded-full bg-blue-300 opacity-30"></div>
                    <div className="absolute inset-0 scale-[0.6] rounded-full bg-blue-200 opacity-30"></div>
                    <div className="absolute inset-0 scale-[0.4] rounded-full bg-blue-100 opacity-30"></div>
                    <div className="absolute inset-0 scale-[0.2] rounded-full bg-white/50 opacity-30"></div>
                </div>
            </div>

            <div className="relative z-10">
                <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl md:mb-4 md:text-5xl">
                    Mange your Study Tools with Ease
                </h1>
                <p className="mb-6 max-w-xl text-base text-white sm:text-lg md:mb-8">
                    Following are the recently used tools, and things that you have created. Continue to use them or create new ones.
                </p>

                <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                    <button className="flex w-full items-center justify-between rounded-full bg-indigo-900 px-5 py-3 text-white sm:w-[240px]">
                        <span className="font-medium">Share your work</span>
                        <span className="h-5 w-5 flex-shrink-0 rounded-full bg-white"></span>
                    </button>
                    <button className="flex w-full items-center justify-between rounded-full bg-indigo-900 px-5 py-3 text-white sm:w-[240px]">
                        <span className="font-medium">create more stuff</span>
                        <span className="h-5 w-5 flex-shrink-0 rounded-full bg-white"></span>
                    </button>
                </div>
            </div>
        </div>
    );
}
export default DashboardCTA