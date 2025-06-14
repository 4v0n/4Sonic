import { reindexLibrary } from "../services/LibraryService";

const SettingsPage = () => {
  const handleReindex = async () => {
    await reindexLibrary();
    alert("Library reindexed");
  };

  return (
    <div className="p-4 space-y-4">
      <button
        className="px-4 py-2 rounded-md bg-(--primary0) hover:bg-(--primary3)"
        onClick={handleReindex}
        type="button"
      >
        Reindex Library
      </button>
    </div>
  );
};

export default SettingsPage;