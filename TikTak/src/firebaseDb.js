import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { app } from "./firebase";

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export { db };
