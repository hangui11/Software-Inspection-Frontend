<script setup>
import eye_closed from '@/assets/icons/eye_closed.svg'
import eye_open from '@/assets/icons/eye_open.svg'
import { ref, onMounted } from 'vue'
import { signIn, logOut, existCurrentUser } from '@/lib/appwrite'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const eye_show = ref(false)
const router = useRouter()

const sign_in = async () => {
  try {
    const session = await signIn(email.value, password.value)
    console.log(session)
    if (session) {
      // alert("Login sucessfully")
      router.push('/dashboard')
    }
  } catch (error) {
    alert(error.message)
  }
}

onMounted(async () => {
  if (await existCurrentUser()) {
    await logOut()
  }
})

// import { Notivue, Notification, push, useNotivue } from 'notivue';
// const config = useNotivue()

// config.update({
//   position: 'top-center'
// })

// const setNotification = () => {
//   push.success({
//     title: 'Success',
//     message: 'Your message has been sent to your friend hangui11.',
//     duration: 1000
//   })
// }
</script>

<template>
  <div class="body">
    <img src="@/assets/images/login_image.png" alt="Login Image" class="image" />

    <div class="container">
      <div class="box">
        <h1>LOGIN</h1>
        <form class="form" @submit.prevent="sign_in" autocomplete="off">
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
          <div class="pwd" @click="router.push('/forgotPassword')">Forgot Password ?</div>
          <button class="button" type="submit">Sign in</button>
        </form>
        <div class="sign_up">
          <p>
            Don't have an account ?
            <a href="/sign_up">Sign Up now</a>
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- <button @click="setNotification">Push</button>

  <Notivue v-slot="item">
    <Notification :item="item" />
  </Notivue> -->
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
  margin-right: 2rem;
  float: inline-end;
  cursor: pointer;
  text-decoration: underline;
  color: rgba(0, 0, 0, 0.65);
}

.pwd:hover {
  color: blue;
}

.sign_up {
  font-size: smaller;
  margin-top: 4rem;
}

p {
  color: rgba(0, 0, 0, 0.6);
}
</style>
