import { ID, Client, Account, Databases, Query, Storage } from 'appwrite'
import { data } from 'autoprefixer'

export const appwriteConfig = {
  endpoints: 'https://fra.cloud.appwrite.io/v1',
  projectId: '69077b0f000a7c658f1f',
  databaseId: '69077bac0022f04161c1',
  userCollectionId: 'users',
  userProjectsCollectionId: 'user_projects',
  projectCollectionId: 'projects',
  engineersDataCollectionId: 'enigineers_data', // <-- Update this with your actual engineers collection ID
  defectsCollectionId: 'defects', // <-- Update this with your actual defects collection ID
  productsCollectionId: 'products',
  checklistsCollectionId: 'checklist',
  checklistItemsCollectionId: 'checklist_items',
  storageBucketId: '6926e205001c81bfb74a'
}

const client = new Client()
client.setEndpoint(appwriteConfig.endpoints).setProject(appwriteConfig.projectId) // Replace with your project ID

const account = new Account(client)
const databases = new Databases(client)
const storage = new Storage(client)


export const signIn = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password)
    return session
  } catch (error) {
    const user = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('email', email)],
    )
    // alert(error.message)
    if (user.documents[0]) throw new Error('Wrong password')
    else if (!user.documents[0]) throw new Error('Not exist the user with email: ' + email)
    else throw error
  }
}

export const logOut = async () => {
  try {
    const session = await account.deleteSession('current')
    return session
  } catch (error) {
    return null
    // alert(error.message)
  }
}

export const signUp = async (email, password, username, avatarURL) => {
  try {
    const taken = await existUserOrEmail(username, email)
    if (taken) throw new Error('Username or Email is already taken')

    const newAccount = await account.create(ID.unique(), email, password, username)
    if (!newAccount) throw new Error('Account creation failed')

    // await account.createEmailPasswordSession(email, password)

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        username: username,
        email: email,
        password: password,
        avatar: avatarURL,
        account_id: newAccount.$id,
      },
    )
    return newUser
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get()

    if (!currentAccount) throw new Error('No exist login account')

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('account_id', currentAccount.$id)],
    )
    if (!currentUser) throw new Error('No exist user related with account')
    return currentUser.documents[0]
  } catch (error) {
    alert('Do not have user logged' + error)
  }
}

export const existCurrentUser = async () => {
  try {
    const currentAccount = await account.get()
    // console.log(currentAccount)

    if (!currentAccount) return false

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('account_id', currentAccount.$id)],
    )
    if (!currentUser) return false
    return true
  } catch (error) {
    // alert('Error ' + error)
    console.log(error)
    return false
  }
}

export const existUserOrEmail = async (username, email) => {
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [
        // 🔑 KEY STEP: Use Query.or() to combine two equality checks
        Query.or([
          // Check 1: Does the document's 'username' field match the input_value?
          Query.equal('username', username),

          // Check 2: Does the document's 'email' field match the input_value?
          Query.equal('email', email),
        ]),

        // Optional: Limit the search to 1, since we only care if one exists
        Query.limit(1),
      ],
    )
    return result.total > 0
  } catch (error) {
    console.error('Error checking username:', error.message)
    throw new Error('Error checking username')
  }
}

export const verification = async () => {
  account.createVerification('https://sunshine-movies.vercel.app/verfication')
}

export const forgotPassword = async (email) => {
  try {
    await account.createRecovery(email, 'http://localhost:5173/forgotPassword')
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

export const resetPassword = async (secret, user_id, password) => {
  try {
    await account.updateRecovery(user_id, secret, password)
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

export const getUserEmail = async (user_id) => {
  console.log(user_id)
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('$id', user_id)],
    )
    const user = result.documents[0]

    console.log(user)
    return user.email
  } catch (error) {
    throw new Error(error)
  }
}

export const getUserProjects = async (username) => {
  try {
    const userProjects = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userProjectsCollectionId,
      [Query.equal('user_id', username)],
    )
    const projectIds = userProjects.documents.map((doc) => doc.project_id)
    // console.log(projectIds)
    const projects = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectCollectionId,
      [Query.contains('$id', projectIds), Query.orderDesc('update_date')],
    )
    // console.log(projects.documents)
    return projects.documents
  } catch (error) {
    console.log(error)
    throw new Error(error)
  }
}

export const createProject = async (project_name, userid) => {
  const todayDateTime = new Date().toISOString()
  try {
    const existProject = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectCollectionId,
      [Query.equal('project_name', project_name), Query.limit(1)],
    )

    if (existProject.total > 0) {
      throw new Error(`The project with name ${project_name} is already used.`)
    }

    const newProject = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.projectCollectionId,
      ID.unique(),
      {
        project_name: project_name,
        members: 1,
        update_date: todayDateTime,
      },
    )
    console.log('Project created successfully:', newProject)

    const newUserProject = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userProjectsCollectionId,
      ID.unique(),
      {
        project_id: newProject.$id,
        user_id: userid,
        user_role: 'owner',
      },
    )
    console.log('User-Project link created:', newUserProject)
    return newProject
  } catch (error) {
    console.log('Error creating project:', error)
    throw error
  }
}

// Assuming databases, appwriteConfig, ID, Query, Permission, and Role are imported

export const joinProject = async (project_id, userid, role) => {
  try {
    // --- 1. CONCURRENT VALIDATION ---
    // Run both validation checks (Project Exists AND User Not Already Joined)
    // concurrently using Promise.all for faster execution.
    const [projectsResult, existUserProject] = await Promise.all([
      // Check 1: Project Exists
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.projectCollectionId, [
        Query.equal('$id', project_id),
        Query.limit(1),
      ]),
      // Check 2: User Not Already Joined
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.userProjectsCollectionId, [
        Query.equal('user_id', userid),
        Query.equal('project_id', project_id),
        Query.limit(1),
      ]),
    ])

    // --- 2. VALIDATION CHECKS (Sequential) ---

    // Check A: Project Existence
    if (projectsResult.total === 0) {
      throw new Error(`Project with ID ${project_id} not found.`)
    }

    // Check B: User Duplication (FIXED: access the total property)
    if (existUserProject.total > 0) {
      throw new Error(`The user ${username} is already in the project.`)
    }

    // --- 3. CREATE NEW LINK DOCUMENT ---
    const newUserProject = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userProjectsCollectionId,
      ID.unique(),
      {
        project_id: project_id,
        user_id: username,
        user_role: role,
      },
    )
    console.log('User-Project link created:', newUserProject)
    return newUserProject
  } catch (error) {
    console.error('Error creating user project link:', error)
    throw error
  }
}

export function formatAppwriteDate(isoString) {
  if (!isoString) return 'N/A'

  try {
    const date = new Date(isoString)
    // Use Intl.DateTimeFormat for robust, localized formatting
    const options = { year: 'numeric', month: 'short', day: 'numeric' }
    return new Intl.DateTimeFormat('en-US', options).format(date)
  } catch (e) {
    console.error('Date parsing error:', e)
    return 'Invalid Date'
  }
}


// --- STORAGE FUNCTIONS ---

export const uploadFileToStorage = async (file) => {
  try {
    const result = await storage.createFile(
      appwriteConfig.storageBucketId,
      ID.unique(),
      file
    )
    return result // Returns file object (contains $id)
  } catch (error) {
    console.error("Storage Upload Error:", error)
    throw error
  }
}

export const getFileView = (fileId) => {
  if (!fileId) return null
  // Returns the URL to view the file
  return storage.getFileView(appwriteConfig.storageBucketId, fileId)
}

export const getFileDownload = (fileId) => {
  if (!fileId) return null
  return storage.getFileDownload(appwriteConfig.storageBucketId, fileId)
}

// --- ADDITIONAL HELPERS ---
export const getProjectAllUsers = async (project_id) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userProjectsCollectionId,
      [Query.equal('project_id', project_id)],
    )
    const projectUserDocs = response.documents
    const finalUsers = []

    for (const doc of projectUserDocs) {
      const userId = doc.user_id
      const userRole = doc.user_role

      if (userId) {
        try {
          const userEmail = await getUserEmail(userId)
          finalUsers.push({
            id: userId,
            email: userEmail,
            role: userRole,
          })
        } catch (userError) {
          console.warn(`Could not fetch details for user ID ${userId}:`, userError)
        }
      }
    }
    return finalUsers
  } catch (error) {
    console.error('Error fetching project user data:', error)
    return []
  }
}


// 1. Fetch all data for the project
export const getProjectData = async (projectId) => {
  try {
    const [engineers, defects, products] = await Promise.all([
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.engineersDataCollectionId,
        [Query.equal('projectId', projectId)]
      ),
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.defectsCollectionId,
        [Query.equal('projectId', projectId)]
      ),
      // Optional: Fetch products from DB if you store them there
      databases.listDocuments(
         appwriteConfig.databaseId,
         appwriteConfig.productsCollectionId,
         [Query.equal('projectId', projectId)]
      )
    ])

    return {
      engineers: engineers.documents,
      defects: defects.documents,
      products: products.documents
    }
  } catch (error) {
    console.error("Error fetching data:", error)
    return { engineers: [], defects: [], products: [] }
  }
}


// 1. Fetch Initial Project Data (Products List)
export const getProjectProducts = async (projectId) => {
    try {
        const products = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.productsCollectionId,
            [Query.equal('projectId', projectId)]
        )
        return products.documents
    } catch (error) {
        console.error("Error fetching products:", error)
        return []
    }
}

// 2. Create Product (After file upload)
export const createProductDocument = async (projectId, userId, fileName, fileId, mimeType) => {
  try {
    const newProduct = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      ID.unique(),
      {
        projectId: projectId,
        userId: userId,
        // Assuming you added these columns to 'products' collection based on requirement
        name: fileName,
        fileId: fileId,
        mimeType: mimeType
      }
    )
    return newProduct
  } catch (error) {
    console.error("Error creating product doc:", error)
    throw error
  }
}

// 3. Fetch Specific Product Data (Engineers + Defects)
export const getProductData = async (projectId, productId) => {
  try {
    const [engineers, defects] = await Promise.all([
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.engineersDataCollectionId,
        [
            Query.equal('projectId', projectId),
            Query.equal('productId', productId)
        ]
      ),
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.defectsCollectionId,
        [
            Query.equal('projectId', projectId),
            Query.equal('productId', productId)
        ]
      )
    ])

    return {
      engineers: engineers.documents,
      defects: defects.documents
    }
  } catch (error) {
    console.error("Error fetching product data:", error)
    return { engineers: [], defects: [] }
  }
}

// 4. Add Defect Transaction
export const addDefectTransaction = async (defectData, engineerData) => {
  // eslint-disable-next-line no-useless-catch
  try {
    // A. Create Defect
    const newDefect = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.defectsCollectionId,
      ID.unique(),
      defectData
    )

    // B. Check/Update Engineer Data
    const existing = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.engineersDataCollectionId,
      [
        Query.equal('projectId', engineerData.projectId),
        Query.equal('productId', engineerData.productId),
        Query.equal('userId', engineerData.userId)
      ]
    )

    if (existing.total > 0) {
      // Update existing
      const doc = existing.documents[0]
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.engineersDataCollectionId,
        doc.$id,
        {
          major: doc.major + (defectData.severity === 'Major' ? 1 : 0),
          minor: doc.minor + (defectData.severity === 'Minor' ? 1 : 0)
        }
      )
    } else {
      // Create new
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.engineersDataCollectionId,
        ID.unique(),
        {
          projectId: engineerData.projectId,
          userId: engineerData.userId,
          productId: engineerData.productId,
          major: defectData.severity === 'Major' ? 1 : 0,
          minor: defectData.severity === 'Minor' ? 1 : 0,
          size: 0,
          time: 0,
          rate: 0,
          est_yield: 0
        }
      )
    }
    return newDefect
  } catch (error) {
    throw error
  }
}

// 5. Update Engineer Info
export const updateEngineerInfo = async (projectId, productId, userId, size, time) => {
  const existing = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.engineersDataCollectionId,
    [
      Query.equal('projectId', projectId),
      Query.equal('productId', productId),
      Query.equal('userId', userId)
    ]
  )

  if (existing.total === 0) throw new Error("No engineer record found.")

  const doc = existing.documents[0]

  // Calculations
  const timeHours = time / 60
  const rate = timeHours > 0 ? (size / timeHours).toFixed(2) : 0
  const est_yield = 85.0

  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.engineersDataCollectionId,
    doc.$id,
    {
      size: Number(size),
      time: Number(time),
      rate: Number(rate),
      est_yield: Number(est_yield)
    }
  )
}

// 6. Auth Helpers
export const getUsernameById = async (userId) => {
  try {
     const userDocs = await databases.listDocuments(
       appwriteConfig.databaseId,
       appwriteConfig.userCollectionId,
       [Query.equal('account_id', userId)]
     )
     return userDocs.total > 0 ? userDocs.documents[0].username : 'Unknown'
  } catch (e) { return 'Unknown' }
}


// --- CHECKLIST FUNCTIONS ---

// 1. Fetch Checklists and their Items
export const getProductChecklists = async (projectId, productId) => {
  try {
    // A. Fetch the Lists (Tabs)
    const listsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.checklistsCollectionId,
      [
        Query.equal('projectId', projectId),
        Query.equal('productId', productId)
      ]
    )

    const lists = listsResponse.documents

    // B. For each list, fetch its items
    // (Optimization: In a huge app, you might fetch all items at once, but this is safer for now)
    const result = await Promise.all(lists.map(async (list) => {
      const itemsResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.checklistItemsCollectionId,
        [Query.equal('checklistId', list.$id)]
      )

      return {
        id: list.$id, // Map $id to id for your UI
        name: list.name,
        isShared: list.isShared,
        items: itemsResponse.documents.map(item => ({
          id: item.$id,
          text: item.text,
          done: item.done
        }))
      }
    }))

    return result
  } catch (error) {
    console.error("Error fetching checklists:", error)
    return []
  }
}

// 2. Create a New List (Tab)
export const createChecklist = async (projectId, productId, userId, name) => {
  const doc = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistsCollectionId,
    ID.unique(),
    {
      name: name,
      isShared: false, // Default
      projectId: projectId,
      productId: productId,
      userId: userId
    }
  )
  // Return formatted object
  return { id: doc.$id, name: doc.name, isShared: doc.isShared, items: [] }
}

// 3. Delete a List (Tab)
export const deleteChecklist = async (checklistId) => {
  // Optional: You should ideally delete all items linked to this list first
  // For simplicity, we just delete the list doc here.
  await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistsCollectionId,
    checklistId
  )
}

// 4. Update Share Status
export const updateChecklistShare = async (checklistId, isShared) => {
  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistsCollectionId,
    checklistId,
    { isShared: isShared }
  )
}

// 5. Add an Item to a List
export const addChecklistItemDB = async (checklistId, text) => {
  const doc = await databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistItemsCollectionId,
    ID.unique(),
    {
      checklistId: checklistId,
      text: text,
      done: false
    }
  )
  return { id: doc.$id, text: doc.text, done: doc.done }
}

// 6. Toggle Item Status (Done/Not Done)
export const updateChecklistItemStatus = async (itemId, isDone) => {
  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistItemsCollectionId,
    itemId,
    { done: isDone }
  )
}

// 7. Delete an Item
export const deleteChecklistItemDB = async (itemId) => {
  await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistItemsCollectionId,
    itemId
  )
}

