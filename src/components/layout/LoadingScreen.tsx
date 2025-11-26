import Spinner from "../ui/Spinner";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner showLabel label={message} className="text-(--primary0)" labelClassName="ml-3 text-lg text-(--text)" />
    </div>
  );
};

export default LoadingScreen;
