<script setup>
// import 
import { useRouter } from 'vue-router';
import not_found from '@/assets/images/404.jpg'
const router = useRouter()
const home = () => {
    router.replace('/')
}
</script>


<template>
    <v-empty-state
        headline="Woops"
        title="Page not found"
        text="The page you were looking for does not exist"
        :image="not_found"
        action-text="Go Home"
        @click:action="home"
    >
    
    </v-empty-state>
</template>

