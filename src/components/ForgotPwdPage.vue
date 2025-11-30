<script setup>
import { forgotPassword, getUserEmail, resetPassword } from '@/lib/appwrite'
import { onMounted } from 'vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import eye_closed from '@/assets/icons/eye_closed.svg'
import eye_open from '@/assets/icons/eye_open.svg'

const router = useRouter()
const urlParams = new URLSearchParams(window.location.search)
const secret = ref('')

const userId = ref('')

const user_email = ref('')

const password = ref('')
const confirm_pwd = ref('')
const email = ref('')
const resetPage = ref(false)
const eye_show = ref(false)

onMounted(async () => {
  secret.value = urlParams.get('secret')
  userId.value = urlParams.get('userId')
  if (secret.value && userId.value) {
    resetPage.value = true
    user_email.value = await getUserEmail(userId.value)
  }
})

const reset_password = async () => {
  if (password.value !== confirm_pwd.value) {
    alert('Make sure that passwords are the same')
    return
  }
  try {
    await resetPassword(secret.value, userId.value, password.value)
    alert('Successfull')
    router.push('/')
  } catch (e) {
    console.error('Error resetting password:', e)
    alert('An error occurred while resetting your password.')
  }
}

const forgot_password = async () => {
  if (email.value == '') {
    alert('Please enter your email to reset your password')
    return
  }
  try {
    await forgotPassword(email.value)
    alert('Email sent')
  } catch (error) {
    console.log(error)
  }
}
</script>

<template>
  <div class="body">
    <img src="@/assets/images/forgot_pwd.png" alt="Forgot Password Illustration" class="image" />
    <div v-if="!resetPage" class="container">
      <div class="box">
        <h1>Forgot Password ?</h1>
        <p>Please enter the email you use to sign in.</p>
        <form class="form" @submit.prevent="forgot_password" autocomplete="off">
          <div class="content-form">
            <input
              type="text"
              v-model="email"
              id="email"
              placeholder="Email"
              required
              autocomplete="email"
            />
          </div>
          <button class="button" type="submit">Request password reset</button>
        </form>
        <div class="sign-in" @click="router.push('/')">Back to Sign in</div>
      </div>
    </div>

    <div v-if="resetPage" class="container">
      <div class="box">
        <h1>Reset Password</h1>
        <p>Enter a new password for {{ user_email }}.</p>
        <form class="form" @submit.prevent="reset_password" autocomplete="off">
          <div class="content-form">
            <input
              :type="eye_show ? 'text' : 'password'"
              v-model="password"
              id="password"
              placeholder="Password"
              autocomplete="current-password"
              required
            />
            <div @click="eye_show = !eye_show">
              <img v-if="!eye_show" :src="eye_open" class="eye" />
              <img v-if="eye_show" :src="eye_closed" class="eye" />
            </div>
          </div>
          <div class="content-form">
            <input
              type="password"
              v-model="confirm_pwd"
              id="password"
              placeholder="Confirm Password"
              autocomplete="current-password"
              required
            />
          </div>
          <button class="button" type="submit">Reset password</button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
}

.body {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100vh;
}

.image {
  width: 50%;
  height: 100%;
  object-fit: contain;
}

.container {
  width: 50%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  /* background-color: #f0f0f0;  */
}

.box {
  width: 70%;
  height: 60%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

h1 {
  font-size: xxx-large;
  margin-bottom: 0;
}

.form {
  width: 85%;
  text-align: center;
}

.content-form {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 1.7rem;
  padding-right: 1rem;
  border-radius: 50px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

input {
  border: none;
  background-color: white;
  outline: none;
  padding: 0.8rem 1rem;
  border-radius: 50px;
  width: 100%;
}

.button {
  cursor: pointer;
  border: none;
  border-radius: 50px;
  width: 88%;
  font-size: 1rem;
  font-weight: 500;
  margin: 1rem 0;
  padding: 1rem;
  padding: 0.7rem;
  color: white;
  background-color: rgba(71, 104, 197, 0.8);
  transition: all 0.3 ease-in-out;
}

.button:hover {
  box-shadow: 0 0 10px rgba(71, 104, 197, 1);
  background-color: rgba(71, 104, 197, 1);
}

input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px white inset !important; /* Cambia el color de fondo al mismo que el fondo del input */
}

.sign-in {
  font-size: smaller;
  cursor: pointer;
  text-decoration: underline;
  color: rgba(0, 0, 0, 0.65);
}

.sign-in:hover {
  color: blue;
}

p {
  color: rgba(0, 0, 0, 0.6);
}

.eye {
  width: 1.25rem;
  object-fit: contain;
}
</style>
