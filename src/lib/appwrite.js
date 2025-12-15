import { ID, Client, Account, Databases, Query, Storage } from 'appwrite'

export const appwriteConfig = {
  endpoints: 'https://fra.cloud.appwrite.io/v1',
  projectId: '69077b0f000a7c658f1f',
  databaseId: '69077bac0022f04161c1',
  storageBucketId: '6926e205001c81bfb74a',
  userCollectionId: 'users',
  userProjectsCollectionId: 'user_projects',
  projectCollectionId: 'projects',
  engineersDataCollectionId: 'enigineers_data',
  defectsCollectionId: 'defects',
  productsCollectionId: 'products',
  checklistsCollectionId: 'checklist',
  checklistItemsCollectionId: 'checklist_items',
  projectInvitationCollectionId: 'project_invitation',
  userCalendarCollectionId: 'user_calendar_list',
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
    console.log('Error in logging out: ', error)
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
  account.createVerification('https://software-inspection-frontend.vercel.app/verfication')
}

export const forgotPassword = async (email) => {
  try {
    await account.createRecovery(
      email,
      'https://software-inspection-frontend.vercel.app/forgotPassword',
    )
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
  // console.log(user_id)
  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('$id', user_id)],
    )
    const user = result.documents[0]

    // console.log(user)
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
    console.log(projectIds)
    if (projectIds.length == 0) {
      return []
    }
    const projects = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectCollectionId,
      [Query.contains('$id', projectIds), Query.orderDesc('update_date')],
    )
    // console.log(projects.documents)

    return projects.documents
  } catch (error) {
    // console.log(error)
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
        usersIds: [userid],
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
      throw new Error(`The user ${userid} is already in the project.`)
    }

    await checkProjectInvitation(project_id, userid)

    await sendAllProjectUsersInvitation(project_id, userid, role)

    console.log(`Send the join request to all the project users.`)

    const projectDocument = projectsResult.documents[0]
    projectDocument.usersIds.push(userid)
    // --- 3. CREATE NEW LINK DOCUMENT ---
    const [newUserProject, updatedProject] = await Promise.all([
      databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userProjectsCollectionId,
        ID.unique(),
        {
          project_id: project_id,
          user_id: userid,
          user_role: role,
        },
      ),

      databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.projectCollectionId,
        projectDocument.$id,
        {
          members: projectDocument.members + 1,
          usersIds: projectDocument.usersIds,
        },
      ),
    ])
    console.log(`User ${userid} successfully joined project ${project_id}.`)

    return { user_project: newUserProject, project: updatedProject }
  } catch (error) {
    console.error('Error creating user project link:', error)
    throw error
  }
}

export const checkProjectInvitation = async (project_id, join_user_id) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectInvitationCollectionId,
      [
        Query.equal('project_id', project_id),
        Query.equal('invited_user_id', join_user_id),
        Query.equal('status', 'pending'),
      ],
    )

    await Promise.all(
      response.documents.map((invitation) =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.projectInvitationCollectionId,
          invitation.$id,
        ),
      ),
    )
    return { deleted: response.total }
  } catch (error) {
    console.log('Error in checking project invitation')
    throw error
  }
}

export const sendAllProjectUsersInvitation = async (project_id, join_user_id, role) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userProjectsCollectionId,
      [Query.equal('project_id', project_id)],
    )

    const projectUsers = response.documents

    const invitations = projectUsers.map((projectUser) =>
      databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.projectInvitationCollectionId,
        ID.unique(),
        {
          invited_user_id: join_user_id,
          project_id: project_id,
          read_by_owner: false,
          role: role,
          project_user_id: projectUser.user_id,
          status: 'joined',
          read_by_invited: true,
        },
      ),
    )
    await Promise.all(invitations)
  } catch (error) {
    console.log(error)
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
    const result = await storage.createFile(appwriteConfig.storageBucketId, ID.unique(), file)
    return result // Returns file object (contains $id)
  } catch (error) {
    console.error('Storage Upload Error:', error)
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
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.engineersDataCollectionId, [
        Query.equal('projectId', projectId),
      ]),
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.defectsCollectionId, [
        Query.equal('projectId', projectId),
      ]),
      // Optional: Fetch products from DB if you store them there
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.productsCollectionId, [
        Query.equal('projectId', projectId),
      ]),
    ])

    return {
      engineers: engineers.documents,
      defects: defects.documents,
      products: products.documents,
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    return { engineers: [], defects: [], products: [] }
  }
}

// 1. Fetch Initial Project Data (Products List)
export const getProjectProducts = async (projectId) => {
  try {
    const products = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.productsCollectionId,
      [Query.equal('projectId', projectId)],
    )
    return products.documents
  } catch (error) {
    console.error('Error fetching products:', error)
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
        projectId,
        userId,
        name: fileName,
        fileId,
        mimeType,
      },
    )
    return newProduct
  } catch (error) {
    console.error('Error creating product doc:', error)
    throw error
  }
}

export const updateUserRoles = async (project_id, updatedUsers) => {
  if (!project_id || !updatedUsers || updatedUsers.length === 0) {
    console.warn('Project ID or user list is missing.')
    return []
  }

  const userIdsToQuery = updatedUsers.map((u) => u.id)
  const updatePromises = []
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userProjectsCollectionId,
      [Query.equal('project_id', project_id), Query.equal('user_id', userIdsToQuery)],
    )
    const currentDocs = response.documents

    for (const updatedUser of updatedUsers) {
      const currentDoc = currentDocs.find((doc) => doc.user_id === updatedUser.id)

      if (!currentDoc) {
        console.warn(`Relationship document not found for user ${updatedUser.id}. Skipping update.`)
        continue
      }
      if (currentDoc.user_role != updatedUser.role) {
        console.log(
          `Role change detected for user ${updatedUser.id}: ${currentDoc.role} -> ${updatedUser.role}`,
        )
        const promise = databases
          .updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userProjectsCollectionId,
            currentDoc.$id,
            {
              user_role: updatedUser.role,
            },
          )
          .catch((err) => {
            console.error(`Failed to update role for user ${updatedUser.id}:`, err)
          })
        updatePromises.push(promise)
      }
    }
    await Promise.all(updatePromises)
    console.log(`Attempted ${updatePromises.length} role updates.`)

    return updatePromises
  } catch (error) {
    console.error('Error in updateUserRoles:', error)
    throw error
  }
}

// 3. Fetch Specific Product Data (Engineers + Defects)
export const getProductData = async (projectId, productId) => {
  try {
    const [engineers, defects] = await Promise.all([
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.engineersDataCollectionId, [
        Query.equal('projectId', projectId),
        Query.equal('productId', productId),
      ]),
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.defectsCollectionId, [
        Query.equal('projectId', projectId),
        Query.equal('productId', productId),
      ]),
    ])

    return {
      engineers: engineers.documents,
      defects: defects.documents,
    }
  } catch (error) {
    console.error('Error fetching product data:', error)
    return { engineers: [], defects: [] }
  }
}
// 4. Add Defect Transaction
export const addDefectTransaction = async (defectData, engineerData) => {
  try {
    // A. Check for Existing Defect based on defectId and productId
    const existingDefects = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.defectsCollectionId,
      [
        Query.equal('productId', defectData.productId),
        Query.equal('defectId', defectData.defectId), // Query by the manual defect ID (line number)
      ],
    )

    let defectDoc // Variable to hold the document reference

    if (existingDefects.total > 0) {
      // --- 1. DEFECT ALREADY EXISTS (UPDATE) ---
      defectDoc = existingDefects.documents[0]
      const currentFinders = defectDoc.foundByUsers || [] // Get existing list
      const currentUserId = defectData.userId

      // If the current user has NOT already reported this exact defect ID
      if (!currentFinders.includes(currentUserId)) {
        // Add the new user to the list of finders
        const newFinders = [...currentFinders, currentUserId]

        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.defectsCollectionId,
          defectDoc.$id,
          {
            // Update the list of users who found it
            foundByUsers: newFinders,
            // NOTE: The description, severity, etc., remain tied to the first user's entry.
          },
        )
      }

      // If the user already reported it, we do nothing to the defect document.
    } else {
      // --- 2. DEFECT IS NEW (CREATE) ---

      // Create the defect document, initializing the foundByUsers array with the current user
      defectDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.defectsCollectionId,
        ID.unique(),
        {
          ...defectData,
          foundByUsers: [defectData.userId], // Initialize with the first finder
        },
      )
    }

    // B. Check/Update Engineer Data (This part remains largely the same)
    // Note: The engineer's major/minor count is now independent of the defect being unique.
    // Every time an engineer REPORTS a defect, their personal count increments.
    const existingEngineer = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.engineersDataCollectionId,
      [
        Query.equal('projectId', engineerData.projectId),
        Query.equal('productId', engineerData.productId),
        Query.equal('userId', engineerData.userId),
      ],
    )

    if (existingEngineer.total > 0) {
      const doc = existingEngineer.documents[0]
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.engineersDataCollectionId,
        doc.$id,
        {
          major: doc.major + (defectData.severity === 'Major' ? 1 : 0),
          minor: doc.minor + (defectData.severity === 'Minor' ? 1 : 0),
        },
      )
    } else {
      // Create new engineer record (initial report)
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
          est_yield: 0,
        },
      )
    }

    // Return the defect document (either the new one or the updated existing one)
    return defectDoc
  } catch (error) {
    console.error('Error adding defect transaction:', error)
    throw error
  }
}

export const getUserInfoByEmail = async (user_email) => {
  try {
    const user = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('email', user_email), Query.limit(1)],
    )
    if (user.total > 0) {
      return user.documents[0]
    } else {
      alert(`The email ${user_email} is not existed`)
      return null
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    throw error
  }
}

export const checkUserInvited = async (project_id, user_id) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectInvitationCollectionId,
      [
        Query.equal('project_id', project_id),
        Query.equal('invited_user_id', user_id),
        Query.limit(1),
      ],
    )
    if (response.total > 0) {
      const invitation = response.documents[0]
      if (invitation.status === 'exited') {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.projectInvitationCollectionId,
          invitation.$id,
        )
        return false
      } else {
        return true
      }
    }
    return response.total > 0
  } catch (error) {
    console.log('Check invited user error: ' + error)
  }
}

export const sendUserInvitations = async (project_id, invitedUserList, project_user_id) => {
  for (const invitedUser of invitedUserList) {
    try {
      const invitedUserInfo = await getUserInfoByEmail(invitedUser.email)
      const checkInvitedUser = await checkUserInvited(project_id, invitedUserInfo.$id)
      if (checkInvitedUser) {
        alert(`The user with ${invitedUser.email} is already invited`)
        return
      }
      if (invitedUserInfo) {
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.projectInvitationCollectionId,
          ID.unique(),
          {
            invited_user_id: invitedUserInfo.$id,
            project_id: project_id,
            role: invitedUser.role,
            project_user_id: project_user_id,
          },
        )
        console.log(`Invitation sent to ${invitedUserInfo.email}`)
      }
    } catch (iterationError) {
      // Handle specific error for one user invitation failure without stopping the loop
      console.error(`Failed to send invitation for user: ${invitedUser.email}`, iterationError)
    }
  }
  console.log('All invitations processed.')
}

export const getUserInfoById = async (user_id) => {
  try {
    const user = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('$id', user_id), Query.limit(1)],
    )
    if (user.total > 0) {
      return user.documents[0]
    } else {
      alert(`The user with ${user_id} is not existed`)
      return null
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    throw error
  }
}

export const updateDefectChecks = async (defectDocId, checkA, checkB) => {
  return await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.defectsCollectionId,
    defectDocId,
    {
      check_a: checkA,
      check_b: checkB,
    },
  )
}

// 5. Update Engineer Info
export const updateEngineerInfo = async (projectId, productId, userId, size, time) => {
  const existing = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.engineersDataCollectionId,
    [
      Query.equal('projectId', projectId),
      Query.equal('productId', productId),
      Query.equal('userId', userId),
    ],
  )

  if (existing.total === 0) throw new Error('No engineer record found.')

  const doc = existing.documents[0]

  // Calculations
  const timeHours = time / 60
  const rate = timeHours > 0 ? Math.round(size / timeHours) : 0
  const est_yield = 85.0

  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.engineersDataCollectionId,
    doc.$id,
    {
      size: Number(size),
      time: Number(time),
      rate: Number(rate),
      est_yield: Number(est_yield),
    },
  )
}

// 6. Auth Helpers
export const getUsernameById = async (userId) => {
  try {
    const userDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('$id', userId)],
    )
    return userDocs.total > 0 ? userDocs.documents[0].username : 'Unknown'
  } catch (e) {
    console.log('Error getting user name: ', e)
    return 'Unknown'
  }
}

// --- CHECKLIST FUNCTIONS ---

// 1. Fetch Checklists and their Items
export const getProductChecklists = async (projectId, productId) => {
  try {
    // A. Fetch the Lists (Tabs)
    const listsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.checklistsCollectionId,
      [Query.equal('projectId', projectId), Query.equal('productId', productId)],
    )

    const lists = listsResponse.documents

    // B. For each list, fetch its items
    // (Optimization: In a huge app, you might fetch all items at once, but this is safer for now)
    const result = await Promise.all(
      lists.map(async (list) => {
        const itemsResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.checklistItemsCollectionId,
          [Query.equal('checklistId', list.$id)],
        )

        return {
          id: list.$id, // Map $id to id for your UI
          name: list.name,
          isShared: list.isShared,
          items: itemsResponse.documents.map((item) => ({
            id: item.$id,
            text: item.text,
            done: item.done,
          })),
        }
      }),
    )

    return result
  } catch (error) {
    console.error('Error fetching checklists:', error)
    return []
  }
}

export const getProjectById = async (project_id) => {
  try {
    const project = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectCollectionId,
      [Query.contains('$id', project_id), Query.limit(1)],
    )
    if (project.total > 0) {
      return project.documents[0]
    } else {
      alert(`The project with ${project_id} is not existed`)
      return null
    }
  } catch (error) {
    console.log('Error getting project by ID: ', error)
  }
}

// In the invited user page
export const showUserInvitation = async (user_id) => {
  const invitations = []

  try {
    const userInvitations = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectInvitationCollectionId,
      [Query.equal('invited_user_id', user_id), Query.equal('status', 'pending')],
    )

    for (const userInvitation of userInvitations.documents) {
      const inviterUserId = userInvitation.project_user_id
      const projectId = userInvitation.project_id
      const [projectUserInfo, projectInfo] = await Promise.all([
        // Fetches the user info of the inviter
        getUserInfoById(inviterUserId),
        // Fetches the project details
        getProjectById(projectId),
      ])
      if (projectUserInfo && projectInfo) {
        invitations.push({
          invitation_id: userInvitation.$id, // Include the invitation ID for later use (Accept/Decline)
          project_id: projectId,
          project_name: projectInfo.project_name, // Assuming the project object has a 'name' field
          role: userInvitation.role,
          isRead: userInvitation.read_by_invited,
          inviter_user: {
            id: projectUserInfo.$id,
            name: projectUserInfo.username, // Assuming the user object has a 'name' field
            email: projectUserInfo.email, // Assuming the user object has an 'email' field
          },
        })
      } else {
        console.warn(
          `Skipping invitation for project ID ${projectId}: Missing project or inviter user info.`,
        )
      }
    }
    return invitations
  } catch (error) {
    console.error('Error showing user invitations:', error)
    // If an error occurs (e.g., connection issue), return an empty array or rethrow
    return []
    // throw error;
  }
}

// In the inviter page
export const showUserRequest = async (user_id) => {
  try {
    await deleteReadRequests(user_id)

    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectInvitationCollectionId,
      [Query.equal('project_user_id', user_id)],
    )

    const sentRequests = response.documents

    if (sentRequests.length === 0) {
      return []
    }

    // 1. Correct Typo and Prepare Promises
    const userPromises = sentRequests.map((request) => getUserInfoById(request.invited_user_id))
    const projectPromises = sentRequests.map((request) => getProjectById(request.project_id))

    // 2. Await concurrent fetches
    const invitedUserInfos = await Promise.all(userPromises)
    const projectInfos = await Promise.all(projectPromises)

    const requests = sentRequests
      .map((request, index) => {
        const invitedUserInfo = invitedUserInfos[index]

        // 🔑 NEW: Access the corresponding project info object
        const project = projectInfos[index]
        if (!invitedUserInfo) {
          console.warn(
            `Could not find invited user info for ID: ${request.invited_user_id}. Skipping.`,
          )
          return null
        }

        // 🔑 CORRECTION & COMPLETION: Merge project data
        return {
          request_id: request.$id,
          status: request.status,
          project_id: request.project_id,
          project_name: project.project_name,
          role: request.role,
          isRead: request.read_by_owner,
          invited_user: {
            id: invitedUserInfo.$id,
            name: invitedUserInfo.username,
            email: invitedUserInfo.email,
          },
        }
      })
      .filter((r) => r !== null)

    return requests
  } catch (error) {
    console.error('Error showing user requests:', error)
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
      userId: userId,
    },
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
    checklistId,
  )
}

// 4. Update Share Status
export const updateChecklistShare = async (checklistId, isShared) => {
  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistsCollectionId,
    checklistId,
    { isShared: isShared },
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
      done: false,
    },
  )
  return { id: doc.$id, text: doc.text, done: doc.done }
}

// 6. Toggle Item Status (Done/Not Done)
export const updateChecklistItemStatus = async (itemId, isDone) => {
  await databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistItemsCollectionId,
    itemId,
    { done: isDone },
  )
}

// 7. Delete an Item
export const deleteChecklistItemDB = async (itemId) => {
  await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.checklistItemsCollectionId,
    itemId,
  )
}

export const readAllMessages = async (
  invitationMessages,
  requestMessages,
  userCalendarMessages,
) => {
  const invitationPromises = invitationMessages.map((message) => {
    // Only update if it's currently marked as unread to save calls
    if (message.read_by_invited !== true) {
      return databases
        .updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.projectInvitationCollectionId,
          message.invitation_id, // This is the $id of the invitation document
          {
            read_by_invited: true,
          },
        )
        .catch((error) => {
          // Log individual error but don't stop Promise.all from running
          console.error(`Error marking invitation ${message.invitation_id} as read:`, error)
          return null // Return null to prevent Promise.all from failing
        })
    }
    return Promise.resolve(null) // Resolve immediately if already read
  })

  const requestPromises = requestMessages.map((message) => {
    // Only update if it's currently marked as unread
    if (message.isRead !== true) {
      return databases
        .updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.projectInvitationCollectionId,
          message.request_id, // This is the $id of the request document
          {
            read_by_owner: true,
          },
        )
        .catch((error) => {
          // Log individual error but don't stop Promise.all from running
          console.error(`Error marking request ${message.request_id} as read:`, error)
          return null
        })
    }
    return Promise.resolve(null)
  })

  const userCalendarPromises = userCalendarMessages.map((message) => {
    if (message.isRead !== true) {
      return databases
        .updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCalendarCollectionId,
          message.id,
          {
            isRead: true,
          },
        )
        .catch((error) => {
          console.error(`Error marking user calendar ${message.id} as read:`, error)
          return null
        })
    }
    return Promise.resolve(null)
  })

  try {
    await Promise.all(invitationPromises)
    await Promise.all(requestPromises)
    await Promise.all(userCalendarPromises)

    console.log('All visible messages processed and marked as read.')
  } catch (error) {
    console.error('Critical error during readAllMessages operation:', error)
  }
}

export const updateInvitationStatus = async (invitation_id, status) => {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.projectInvitationCollectionId,
      invitation_id,
      {
        read_by_owner: false,
        status: status,
      },
    )
  } catch (error) {
    console.log(`Error updating invitation status with ${invitation_id}: `, error)
  }
}

export const deleteReadRequests = async (user_id) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const checkRequest = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.projectInvitationCollectionId,
      [
        Query.equal('project_user_id', user_id),
        Query.notEqual('status', 'pending'),
        Query.equal('read_by_owner', true),
        Query.lessThan('$createdAt', oneDayAgo),
      ],
    )

    const documentsToDelete = checkRequest.documents

    if (documentsToDelete.length === 0) {
      console.log('No completed and read requests found to delete.')
      return
    }

    const deletionPromises = documentsToDelete.map((doc) =>
      databases
        .deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.projectInvitationCollectionId,
          doc.$id,
        )
        .catch((error) => {
          // Log individual error but allow Promise.all to continue
          console.error(`Error deleting invitation ID ${doc.$id}:`, error)
          return null
        }),
    )

    await Promise.all(deletionPromises)

    console.log(`Successfully deleted ${documentsToDelete.length} completed and read requests.`)
  } catch (error) {
    console.error('Critical error during deletion of read requests:', error)
    // throw error;
  }
}

export const leaveProject = async (project_id, user_id) => {
  try {
    // --- STEP 1: Concurrently list ALL parent documents to be deleted and the project doc ---
    const [
      checklists,
      defects,
      engineerData,
      userProject,
      invitationProject,
      userCalendar,
      projectDocList,
    ] = await Promise.all([
      // List Checklists created by the user (non-shared)
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.checklistsCollectionId, [
        Query.equal('userId', user_id),
        Query.equal('projectId', project_id),
        Query.equal('isShared', false),
      ]),
      // List Defects
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.defectsCollectionId, [
        Query.equal('userId', user_id),
        Query.equal('projectId', project_id),
      ]),
      // List Engineer Data records
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.engineersDataCollectionId, [
        Query.equal('userId', user_id),
        Query.equal('projectId', project_id),
      ]),
      // List the UserProject relationship document
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.userProjectsCollectionId, [
        Query.equal('user_id', user_id),
        Query.equal('project_id', project_id),
        Query.limit(1),
      ]),
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.projectInvitationCollectionId,
        [
          Query.equal('project_id', project_id),
          Query.or([
            Query.equal('invited_user_id', user_id),
            Query.equal('project_user_id', user_id),
          ]),
        ],
      ),
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.userCalendarCollectionId, [
        Query.equal('project_id', project_id),
        Query.equal('user_id', user_id),
      ]),
      // List the main Project document
      databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.projectCollectionId, [
        Query.equal('$id', project_id),
        Query.limit(1),
      ]),
    ])

    const projectDocument = projectDocList.documents[0]
    const checklistIds = checklists.documents.map((doc) => doc.$id)

    let allDeletionPromises = []

    // --- STEP 2: Fetch Nested Checklist Items (Sequential Step) ---
    let checklistItems = { documents: [] }
    if (checklistIds.length > 0) {
      // 💡 Using Query.listDocument (or Query.contains) to fetch child documents
      // Note: Query.contains is limited to ~100 values. If you have more, you must loop.
      try {
        checklistItems = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.checklistItemsCollectionId,
          [
            Query.equal('checklistId', checklistIds), // Assumes Appwrite supports passing array to Query.equal
            // If Appwrite doesn't support an array in Query.equal, use Query.contains('checklistId', checklistIds)
          ],
        )
      } catch (fetchError) {
        console.warn(
          'Could not fetch checklist items with array query. Falling back to empty list.',
          fetchError,
        )
        // If the array query fails, checklistItems remains empty.
      }
    }

    // --- STEP 3: Prepare ALL deletion promises (including checklistItems) ---

    // Helper function to map list results to deleteDocument promises
    const mapToDeletePromises = (listResult, collectionId) =>
      listResult.documents.map((doc) =>
        databases
          .deleteDocument(appwriteConfig.databaseId, collectionId, doc.$id)
          .catch((err) =>
            console.error(`Failed to delete document ${doc.$id} from ${collectionId}:`, err),
          ),
      )

    // Add deletion promises for all document types
    allDeletionPromises.push(
      ...mapToDeletePromises(checklists, appwriteConfig.checklistsCollectionId),
    )
    allDeletionPromises.push(...mapToDeletePromises(defects, appwriteConfig.defectsCollectionId))
    allDeletionPromises.push(
      ...mapToDeletePromises(engineerData, appwriteConfig.engineersDataCollectionId),
    )
    allDeletionPromises.push(
      ...mapToDeletePromises(userProject, appwriteConfig.userProjectsCollectionId),
    )
    allDeletionPromises.push(
      ...mapToDeletePromises(checklistItems, appwriteConfig.checklistItemsCollectionId),
    )
    allDeletionPromises.push(
      ...mapToDeletePromises(invitationProject, appwriteConfig.projectInvitationCollectionId),
    )
    allDeletionPromises.push(
      ...mapToDeletePromises(userCalendar, appwriteConfig.userCalendarCollectionId),
    )

    // --- STEP 4: Handle Project Update (Decrement members and remove ID) ---
    if (projectDocument) {
      const updatedUsersIds = projectDocument.usersIds.filter((id) => id !== user_id)
      allDeletionPromises.push(
        databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.projectCollectionId,
          projectDocument.$id,
          {
            members: Math.max(0, projectDocument.members - 1),
            usersIds: updatedUsersIds,
          },
        ),
      )

      for (const user of updatedUsersIds) {
        allDeletionPromises.push(
          databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.projectInvitationCollectionId,
            ID.unique(),
            {
              invited_user_id: user_id,
              project_id: project_id,
              read_by_owner: false,
              role: '',
              project_user_id: user,
              status: 'exited',
              read_by_invited: true,
            },
          ),
        )
      }
    } else {
      console.warn(`Project document ID ${project_id} not found.`)
    }

    // --- STEP 5: Execute all deletions and the single update concurrently ---
    await Promise.all(allDeletionPromises)

    console.log(
      `User ${user_id} successfully left project ${project_id}. All associated records deleted.`,
    )
  } catch (error) {
    console.error('Error leaving project:', error)
    throw error
  }
}

export const deleteProject = async (project_id, user_id) => {
  try {
    await leaveProject(project_id, user_id)

    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.projectCollectionId,
      project_id,
    )
    console.log(`Project ID ${project_id} has been permanently deleted.`)
  } catch (error) {
    console.error('Error deleting project:', error)
    throw error
  }
}

export const getUserProjectById = async (project_id, user_id) => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userProjectsCollectionId,
      [Query.equal('user_id', user_id), Query.equal('project_id', project_id), Query.limit(1)],
    )
    if (response.total > 0) return response.documents[0]
    return ''
  } catch (error) {
    console.log(error)
    return ''
  }
}

export const saveCalendarInformation = async (
  user_id,
  project_id,
  startDate, // JavaScript Date object
  endDate, // JavaScript Date object
  startTime,
  endTime,
  content,
  type,
) => {
  // 1. Combine Date objects with time strings and convert to ISO format.
  //    This creates the precise Datetime needed for Appwrite comparison.
  const newStartDateTimeBefore = new Date(
    `${startDate.toISOString().split('T')[0]}T${startTime}:00Z`,
  )
  const newEndDateTimeBefore = new Date(`${endDate.toISOString().split('T')[0]}T${endTime}:00Z`)

  const newStartDateTime = new Date(newStartDateTimeBefore.getTime() + 24 * 60 * 60 * 1000)
  const newEndDateTime = new Date(newEndDateTimeBefore.getTime() + 24 * 60 * 60 * 1000)

  if (isNaN(newStartDateTime.getTime()) || isNaN(newEndDateTime.getTime())) {
    throw new Error('Invalid start or end date/time provided. Please check the date format.')
  }

  // Appwrite Datetime queries require ISO 8601 strings
  const startISO = newStartDateTime.toISOString()
  const endISO = newEndDateTime.toISOString()
  console.log(startISO, endISO)

  try {
    // --- 🔍 OVERLAP CHECK ---

    // Checks if any existing event starts before the new one ends AND ends after the new one starts.
    const overlapQueries = [
      Query.equal('user_id', user_id),
      // Existing event must START before the new event ENDS
      Query.lessThan('start_date', endISO),
      // Existing event must END after the new event STARTS
      Query.greaterThan('end_date', startISO),
    ]

    const overlappingDocuments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCalendarCollectionId,
      overlapQueries,
    )

    if (overlappingDocuments.total > 0) {
      const docs = overlappingDocuments.documents

      for (const doc of docs) {
        const startDate = new Date(doc.start_date)
        const endDate = new Date(doc.end_date)

        const startUTCHour = startDate.getUTCHours()
        const startUTCMinute = startDate.getUTCMinutes()
        const startformattedUTCTime = `${String(startUTCHour).padStart(2, '0')}:${String(startUTCMinute).padStart(2, '0')}`

        const endUTCHour = endDate.getUTCHours()
        const endUTCMinute = endDate.getUTCMinutes()
        const endformattedUTCTime = `${String(endUTCHour).padStart(2, '0')}:${String(endUTCMinute).padStart(2, '0')}`

        if (startformattedUTCTime < endTime && endformattedUTCTime > startTime) {
          throw new Error('Overlap detected. Time slot is busy.')
        }
      }
    }

    // --- ✅ SAVE NEW DOCUMENT (If No Overlap) ---

    await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCalendarCollectionId,
      ID.unique(),
      {
        user_id: user_id,
        project_id: project_id,
        // Save the combined Datetime ISO strings
        start_date: startISO,
        end_date: endISO,
        content: content,
        type: type,
      },
    )

    console.log('Calendar information saved successfully.')
  } catch (error) {
    // If the error originated from the overlap check, re-throw the custom message.
    if (error.message.includes('Overlap detected')) {
      throw error
    }
    // Otherwise, throw a general Appwrite/Database error.
    console.error('Error saving calendar information:', error)
    throw new Error(
      `Failed to save event: ${error.message || 'Check database connection/permissions.'}`,
    )
  }
}

export const saveCalendarProjectInformation = async (
  project_id,
  startDate,
  endDate,
  startTime, // 🔑 Added missing parameter
  endTime,
  content,
  type,
) => {
  let projectUsers = []

  try {
    // 1. Fetch the project and extract user IDs
    const project = await getProjectById(project_id)

    if (!project || !project.usersIds || project.usersIds.length === 0) {
      console.warn(`Project ${project_id} not found or has no users.`)
      return
    }

    projectUsers = project.usersIds
    console.log(`Scheduling event for ${projectUsers.length} users.`)

    // 2. Loop through all users and save the event for each one
    const savePromises = projectUsers.map((user_id) => {
      // Assuming saveCalendarInformation handles overlap checks internally
      return saveCalendarInformation(
        user_id,
        project_id,
        startDate,
        endDate,
        startTime,
        endTime,
        content,
        type,
      )
    })

    // Wait for all save operations to complete (or fail)
    await Promise.allSettled(savePromises)

    console.log(`Project event scheduling complete for project ID: ${project_id}`)
  } catch (error) {
    console.error(`🛑 Error in saveCalendarProjectInformation for project ${project_id}:`, error)
    // Throwing an error here allows the calling function to know that the overall process failed.
    throw new Error(`Failed to schedule project event: ${error.message}`)
  }
}

export const getUserCalendar = async (user_id) => {
  try {
    const userCalendar = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCalendarCollectionId,
      [Query.equal('user_id', user_id)],
    )

    if (userCalendar.total > 0) {
      // 🔑 CRITICAL FIX: Map over documents and convert ISO date strings to Date objects.
      const documentsWithDates = userCalendar.documents.map((doc) => {
        return {
          ...doc,
          // The database returns these as ISO strings, converting them allows direct access to hours/minutes
          start_date: new Date(doc.start_date),
          end_date: new Date(doc.end_date),
        }
      })

      return documentsWithDates
    } else {
      return null
    }
  } catch (error) {
    console.error('Error fetching user calendar:', error)
    // You might want to throw the error instead of returning null on failure
    throw error
  }
}

export const changeUserCalendarReminded = async (id, status) => {
  try {
    const updatedDocument = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCalendarCollectionId,
      id,
      {
        reminded: status,
        isRead: false,
      },
    )

    console.log(`Document ID ${id} 'reminded' status updated to: ${status}`)
    return updatedDocument
  } catch (error) {
    console.error(`Error updating document ID ${id} in Appwrite:`, error)
    throw new Error(`Failed to update reminder status for ID ${id}.`)
  }
}

export const showUserCalendar = async (user_id) => {
  const userCalendarList = []

  // Define the date formatting options: Day, Month, Day of Month.
  // The browser will typically include the year if it differs from the current year.
  const dateOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric', // Include year for full accuracy
  }

  try {
    const userCalendars = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCalendarCollectionId,
      // Query to get events for the user that are marked as 'reminded'
      [Query.equal('user_id', user_id), Query.equal('reminded', true)],
    )

    if (userCalendars.total > 0) {
      const userCalendarsDoc = userCalendars.documents

      for (const userCalendar of userCalendarsDoc) {
        // 1. Convert Appwrite string dates to Date objects
        const startDate = new Date(userCalendar.start_date)
        const endDate = new Date(userCalendar.end_date)

        // 2. Format Times (UTC) - This logic remains correct
        const startUTCHour = startDate.getUTCHours()
        const startUTCMinute = startDate.getUTCMinutes()
        const startformattedUTCTime = `${String(startUTCHour).padStart(2, '0')}:${String(startUTCMinute).padStart(2, '0')}`

        const endUTCHour = endDate.getUTCHours()
        const endUTCMinute = endDate.getUTCMinutes()
        const endformattedUTCTime = `${String(endUTCHour).padStart(2, '0')}:${String(endUTCMinute).padStart(2, '0')}`

        // 3. 🔑 FIX: Format Dates for Display
        const formattedStartDate = startDate.toLocaleDateString('en-US', dateOptions)
        const formattedEndDate = endDate.toLocaleDateString('en-US', dateOptions)

        const projectInfo = await getProjectById(userCalendar.project_id)
        const project_name = projectInfo.project_name

        userCalendarList.push({
          id: userCalendar.$id,
          project_id: userCalendar.project_id,
          project_name: project_name,
          type: userCalendar.type,
          start_time: startformattedUTCTime,
          end_time: endformattedUTCTime,
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          isRead: userCalendar.isRead,
          content: userCalendar.content,
        })
      }
    }
  } catch (error) {
    console.error('Error fetching user calendar for display:', error)
    // Return an empty list or re-throw the error
  }

  return userCalendarList
}

export const updateProjectStatus = async (project_id, status) => {
  try {
    const updatedDocument = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.projectCollectionId,
      project_id,
      {
        project_status: status,
      },
    )

    return updatedDocument
  } catch (error) {
    console.error(`Error updating project ID ${project_id} status:`, error)
    throw new Error(`Failed to update project status for ID ${project_id}.`)
  }
}

export const deletePastUserCalendar = async (user_id) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCalendarCollectionId,
      [Query.equal('user_id', user_id), Query.lessThan('end_date', oneWeekAgo)],
    )

    await Promise.all(
      response.documents.map((doc) =>
        databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCalendarCollectionId,
          doc.$id,
        ),
      ),
    )

    return { deleted: response.total }
  } catch (error) {
    console.error(`Error deleting past calendar for user ${user_id}:`, error)
    throw error
  }
}
