import Head from 'next/head'
import { useState, useEffect } from 'react'

function getUrlQueryParam(name) {
  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)
  return urlParams.get(name)
}

function prependConversationMetadata(message) {
  return `{"company": "${getUrlQueryParam("company") || ""}", "campaign": "${getUrlQueryParam("campaign") || ""}"}
${message}`
}

export default function Index() {
  // STEP 1
  // Setup state to track send and received messages, the text input and the
  // conversation id and token.

  const defaultMessages = [
    {
      id: "greeting",
      text: "Hi! As an employee, do you have any feedback your managers should hear?",
      type: "bot"
    }
  ]

  const [messages, setMessages] = useState(defaultMessages)

  const [text, setText] = useState('')

  const [conversationId, setConversationId] = useState(null)

  const [token, setToken] = useState(null)

  const [isResponseInProgress, setIsResponseInProgress] = useState(false)

  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, [messages])

  // STEP 2
  // Define a generic method to handle any errors.

  function handleError(err) {
    setIsResponseInProgress(false)
    console.error(err)
  }

  function isFirstSend() {
    return messages.length === 1
  }

  // STEP 3
  // Here we define two methods. The continueConversation sends and receives the
  // next message. Note that this method interfaces directly with the ChatBotKit
  // API using the temporary conversation token. The startConversation method
  // is used to start the conversation using our own API. See the code for route
  // pages/api/create.js for more information.

  async function continueConversation(cid = conversationId, tkn = token) {
    // get hold of a new instances of messages in order to update the state

    let newMessages = messages.slice(0)

    // Sub-step A: send the user message to the conversation instance

    const response01 = await fetch(`https://api.chatbotkit.com/v1/conversation/${cid}/send`, {
      method: 'POST',

      headers: {
        'Authorization': `Bearer ${tkn}`,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        text: isFirstSend() ? prependConversationMetadata(text) : text
      })
    })

    if (!response01.ok) {
      handleError(await response01.json())

      return
    }

    const { id: sendMessageId } = await response01.json()


    // Sub-step B: receive a message from the conversation instance

    const response02= await fetch(`https://api.chatbotkit.com/v1/conversation/${cid}/receive`, {
      method: 'POST',

      headers: {
          'Authorization': `Bearer ${tkn}`,
          'Content-Type': 'application/json'
      },

      body: JSON.stringify({})
    })

    if (!response02.ok) {
      handleError(await response02.json())

      return
    }

    const { id: receiveMessageId, text: receiveText } = await response02.json()
    
    const savedUserMessage = {
      id: sendMessageId,
      text,
      type: "user"
    }

    const botResponse = {
      id: receiveMessageId,
      text: receiveText,
      type: "bot"
    }

    setMessages(newMessages.concat([
      savedUserMessage,
      botResponse
    ]))

    setIsResponseInProgress(false)
  }

  async function startConversation() {
    const response = await fetch('/api/create')

    if (!response.ok) {
      handleError(await response.json())

      return
    }

    const { conversationId, token } = await response.json()

    setConversationId(conversationId)
    setToken(token)

    continueConversation(conversationId, token)
  }

  function handleSend() {
    if (isResponseInProgress) {
      return
    }

    setText("")
    setIsResponseInProgress(true)

    const unsavedUserMessage = {
      id: "temporaryId",
      text,
      type: "user"
    }

    const unsavedBotMessage = {
      id: "temporaryBotId",
      text: "OpenOrg is typing...",
      type: "bot"
    }

    setMessages(messages.concat([
      unsavedUserMessage,
      unsavedBotMessage
    ]))

    if (conversationId) {
      continueConversation()
    } else {
      startConversation()
    }
  }

  function handleOnKeyDown(event) {
    // ENTER KEY

    if (event.keyCode === 13) {
      event.preventDefault()

      handleSend()
    }
  }

  return (
    <>
      <Head>
        <title>OpenOrg Chatbot</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        {/* messages */}
        <div
          style={{
            overflow: "scroll",
            height: "100%",
            marginBottom: 150
          }}>
          {
            messages.map(({ id, type, text }) => {
              return (
                <div
                  style={{
                    display: "flex",
                    padding: "20px 20px",
                    backgroundColor: type === "user" ? "none" : "#f2f8fa"
                  }}
                  key={id}
                  >
                  <div
                    style={{
                      marginRight: 20,
                    }}
                    >
                    <img
                      width="30"
                      height="30"
                      src={type === "user" ? "/usericon.png" : "/openorgicon.png"}
                      />
                  </div>
                  <div>
                    {text}
                  </div>
                </div>
              )
            })
          }
        </div>
        {/* input */}
        <div
          style={{
            position: "fixed",
            zIndex: 1,
            bottom: 0,
            width: "100%"
          }}
          >
          <div
            style={{
              position: "relative",
              margin: "20px 40px",
              border: "1px solid #c2c0c0",
              borderRadius: "10px",
              padding: "20px 60px 20px 20px",
              backgroundColor: "white"
            }}
            >
            <textarea
              style={{
                width: '100%',
                minHeight: 24,
                resize: "none",
                border: "0 solid black",
                outline: "none",
                overflow: "auto"
              }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleOnKeyDown}
              placeholder="Tell us your thoughts..."
              />
            <button
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                cursor: "pointer",
                width: 40,
                height: 40,
                padding: "12px 10px 10px 10px"
              }}
              onClick={handleSend}
              >
              {
                isResponseInProgress ?
                "..." :
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              }
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
