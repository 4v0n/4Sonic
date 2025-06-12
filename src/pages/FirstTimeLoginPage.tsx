import { useApiStore } from "../store/ApiStore";

function FirstTimeLoginPage() {
  const { setUrl } = useApiStore();
  const handleLogin = () => {
    setUrl("temporary");
  };

  return (
    <div>
      <button className="cursor-pointer rounded-full bg-(--primary0) p-3" onClick={handleLogin} >
        login
      </button>
    </div>
  );
}

export default FirstTimeLoginPage;