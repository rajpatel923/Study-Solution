interface FeatureCardProps {
    title: string;
    description: string;
  }
  
  const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md w-72 text-center">
        <h3 className="text-xl font-semibold text-blue-500">{title}</h3>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>
    );
  };
  
  export default FeatureCard;
  