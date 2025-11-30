<script setup>
import eye_closed from '@/assets/icons/eye_closed.svg'
import eye_open from '@/assets/icons/eye_open.svg'
import { ref } from 'vue'
import { signUp } from '@/lib/appwrite'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const email = ref('')
const eye_show = ref(false)
const router = useRouter()

const sign_up = async () => {
  try {
    let avatarURL =
      'https://api.dicebear.com/9.x/identicon/svg?seed=' + Math.floor(Math.random() * 1000)

    const response = await signUp(email.value, password.value, username.value, avatarURL)

    console.log(response)

    if (response) {
      alert('Sign up successfully')
      router.push('/')
    }
  } catch (error) {
    alert(error.message)
  }
}
</script>

<template>
  <div class="body">
    <img src="@/assets/images/login_image.png" alt="Login Image" class="image" />
    <div class="container">
      <!-- <a href="/">back</a> -->
      <div class="box">
        <h1>SIGN UP</h1>
        <form class="form" @submit.prevent="sign_up" autocomplete="off">
          <div class="content-form">
            <input type="text" v-model="email" placeholder="Email" required autocomplete="email" />
          </div>
          <div class="content-form">
            <input
              type="text"
              v-model="username"
              placeholder="Username"
              required
              autocomplete="username"
            />
          </div>
          <div class="content-form">
            <input
              :type="eye_show ? 'text' : 'password'"
              v-model="password"
              placeholder="Password"
              autocomplete="current-password"
              required
            />
            <div @click="eye_show = !eye_show">
              <img v-if="!eye_show" :src="eye_open" class="eye" />
              <img v-if="eye_show" :src="eye_closed" class="eye" />
            </div>
          </div>

          <button class="button" type="submit">Sign up</button>
        </form>
        <div class="sign_in">
          <p>
            Already have an account?
            <a href="/">Log In</a>
          </p>
        </div>
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
  width: 100%;
  height: 100vh;
}

.image {
  width: 50%;
  height: 100%;
  object-fit: cover;
}

.container {
  width: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  /* background-color: #f0f0f0;  */
}

.box {
  width: 50%;
  height: 75%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

h1 {
  font-size: xxx-large;
  margin-bottom: 1.5rem;
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

.eye {
  width: 1.25rem;
  object-fit: contain;
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
  width: 80%;
  font-size: 1rem;
  font-weight: 500;
  margin: 1rem 0;
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

.pwd {
  font-size: smaller;
}
.sign_in {
  font-size: smaller;
  margin-top: 2.5rem;
}

p {
  color: rgba(0, 0, 0, 0.6);
}
</style>
