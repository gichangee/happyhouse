
import { ref } from "vue"
import { useRouter } from "vue-router"
import { defineStore, storeToRefs } from "pinia"
import { jwtDecode } from "jwt-decode"

import { userConfirm, findById, tokenRegeneration, logout,confirmUserid } from "@/api/user"
import { httpStatusCode } from "@/util/http-status"

export const useUserStore = defineStore("userStore", () => {
  const router = useRouter()

  const isLogin = ref(false)
  const userInfo = ref(null)
  const isLoginError = ref(false)
  const isValidToken = ref(false)

  //로그인
  const userLogin = async (loginUser) => {
    await userConfirm(
      loginUser,
      (response) => {
        if (response.status === httpStatusCode.CREATE) {
          console.log("로그인 성공!!!!")
          let { data } = response
          let accessToken = data["access-token"]
          let refreshToken = data["refresh-token"]
          isLogin.value = true
          isLoginError.value = false
          isValidToken.value = true
          sessionStorage.setItem("accessToken", accessToken)
          sessionStorage.setItem("refreshToken", refreshToken)
        }
      },
      (error) => {
        console.log("로그인 실패!!!!")
        isLogin.value = false
        isLoginError.value = true
        isValidToken.value = false
        console.error(error)
      }
    )
  }

  //유저정보 가져오기
  const getUserInfo = async (token) => {
    if(token==undefined){
        userInfo.value=null;
        isLogin.value=false;      
    }
    if (token !== null) {
      let decodeToken = jwtDecode(token)
      console.log("getUserInfo " + decodeToken.userId)
      await findById(
        decodeToken.userId,
        (response) => {
          if (response.status === httpStatusCode.OK) {
            userInfo.value = response.data.userInfo
            isLogin.value = true;
          } else {
            console.log("유저 정보 없음!!!!")
            isLogin.value = false;
          }
        },
        async (error) => {
          console.error(
            "g[토큰 만료되어 사용 불가능.] : ",
            error.response.status,
            error.response.statusText
          )
          isValidToken.value = false
          sessionStorage.removeItem("accessToken");
          // 다시 로그인하도록 만들기
          await tokenRegenerate()
        }
      )
    }

  }


  //토큰
  const tokenRegenerate = async () => {
    await tokenRegeneration(
      JSON.stringify(userInfo.value),
      (response) => {
        if (response.status === httpStatusCode.CREATE) {
          let accessToken = response.data["access-token"]
          sessionStorage.setItem("accessToken", accessToken)
          isValidToken.value = true
        }
      },
      async (error) => {
        // HttpStatus.UNAUTHORIZE(401) : RefreshToken 기간 만료 >> 다시 로그인!!!!
        if (error.response.status === httpStatusCode.UNAUTHORIZED) {
          // 다시 로그인 전 DB에 저장된 RefreshToken 제거.
          await logout(
            userInfo.value.userid,
            (response) => {
              if (response.status === httpStatusCode.OK) {
                console.log("리프레시 토큰 제거 성공")
              } else {
                console.log("리프레시 토큰 제거 실패")
              }
              alert("RefreshToken 기간 만료!!! 다시 로그인해 주세요.")
              isLogin.value = false
              userInfo.value = null
              isValidToken.value = false
              router.push({ name: "user-login" })
            },
            (error) => {
              console.error(error)
              isLogin.value = false
              userInfo.value = null
            }
          )
        }
      }
    )
  }

  //로그아웃
  const userLogout = async () => {
    console.log("로그아웃 "+userInfo.value);
    console.log("로그아웃 아이디 : " + userInfo.value.user_id)
    await logout(
      userInfo.value.user_id,
      (response) => {
        if (response.status === httpStatusCode.OK) {
          isLogin.value = false
          userInfo.value = null
          isValidToken.value = false

          sessionStorage.removeItem("accessToken")
          sessionStorage.removeItem("refreshToken")
        } else {
          console.error("유저 정보 없음!!!!")
        }
      },
      (error) => {
        console.log(error)
      }
    )
  }

  // const checkAvailableUserId = async (user_id) => {
  //   console.log("checkUserId" + user_id)
  //   await confirmUserid(user_id, (response) => {
  //     //true-> userid사용중인것
  //     console.log(response.data);
  //     if (response.data.result) {
  //       return false;
  //     }
  //     else return true;
  //   }, (error) => {
  //     console.log(error)
  //   })
  // }

  return {
    // checkAvailableUserId,
      isLoginError,
      isValidToken,
    isLogin,
    userInfo,
    userLogin,
    getUserInfo,
    tokenRegenerate,
    userLogout,
  }
})
