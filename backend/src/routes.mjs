// @ts-check

import moveBoardChildToIndex from './domain/moveBoardChildToIndex.mjs'
import getDenormalizedBoard from './domain/getDenormalizedBoard.mjs'
import assertCanEditPortal from './domain/assertCanEditPortal.mjs'
import assertCanEditBoard from './domain/assertCanEditBoard.mjs'
import assertCanEditCard from './domain/assertCanEditCard.mjs'
import assertCanEditDeck from './domain/assertCanEditDeck.mjs'
import assertIsVerified from './domain/assertIsVerified.mjs'
import getBoardsForUser from './domain/getBoardsForUser.mjs'
import requireInteger from './utils/requireInteger.mjs'
import addCardImages from './domain/addCardImages.mjs'
import createProject from './domain/createProject.mjs'
import requireString from './utils/requireString.mjs'
import authenticate from './domain/authenticate.mjs'
import createBoard from './domain/createBoard.mjs'
import createUser from './domain/createUser.mjs'
import deleteCard from './domain/deleteCard.mjs'
import addPortal from './domain/addPortal.mjs'
import moveCard from './domain/moveCard.mjs'
import addDeck from './domain/addDeck.mjs'
import addCard from './domain/addCard.mjs'
import getCard from './domain/getCard.mjs'
import login from './domain/login.mjs'
import { Stream } from 'stream'
import Boom from '@hapi/boom'
import knex from './db.mjs'
import fs from 'fs'

export const loginRoute = {
  method: 'POST',
  path: '/login',
  /**
   * @param {{ payload: { username: string, password: string } }} request
   * @returns {Promise<{ sessionId: string }>}
   */
  async handler(request) {
    const { username, password } = request.payload
    const sessionId = await login(username, password)

    return {
      sessionId,
    }
  },
}

export const authenticateRoute = {
  method: 'POST',
  path: '/authenticate',
  handler: authenticate,
}

export const createBoardRoute = {
  method: 'POST',
  path: '/createBoard',
  /**
   * @param {{ payload: { boardId: string, title: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { boardId, title } = request.payload
    const { userId } = await authenticate(request)

    await assertIsVerified(request)

    await createBoard({
      createdBy: userId,
      boardId,
      title,
    })

    return { success: true }
  },
}

export const ownBoardsRoute = {
  method: 'POST',
  path: '/ownBoards',
  /**
   * @param {{ headers: { authorization: string } }} request
   * @returns {Promise<{ boards: import('./types').Board[] }>}
   */
  async handler(request) {
    const session = await authenticate(request)
    const boards = await getBoardsForUser(session.userId)

    return { boards }
  },
}

export const getBoardRoute = {
  method: 'POST',
  path: '/getBoard',
  /**
   * @param {{ payload: { boardId: string }, headers: { authorization: string } }} request
   * @returns {Promise<import('./types').Board>}
   */
  async handler(request) {
    const { boardId } = request.payload

    if (typeof boardId !== 'string')
      throw Boom.badRequest('boardId must be a string')

    await assertCanEditBoard(request, boardId)

    return await getDenormalizedBoard(boardId)
  },
}

/**
 * @type {import('./types').Route<
 * { sessionId: string },
 * { success: boolean }
 * >}
 */
export const logoutRoute = {
  method: 'POST',
  path: '/logout',
  /**
   * @param {{ payload: { sessionId: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const session = await authenticate(request)

    await knex('sessions').where('sessionId', session.sessionId).del()

    return { success: true }
  },
}

export const addDeckRoute = {
  method: 'POST',
  path: '/addDeck',
  /**
   * @param {{ payload: { boardId: string, title: string, index: number }, headers: { authorization: string } }} request
   * @returns {Promise<{ deckId: string }>}
   */
  async handler(request) {
    const { boardId, title, index } = request.payload

    if (typeof boardId !== 'string')
      throw Boom.badRequest('boardId must be a string')

    await assertCanEditBoard(request, boardId)

    const deckId = await addDeck({ boardId, title, index })

    return { deckId }
  },
}

export const addPortalRoute = {
  method: 'POST',
  path: '/addPortal',
  /**
   * @param {{ payload: { boardId: string, title: string, index: number, deckId: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ portalId: string }>}
   */
  async handler(request) {
    const { boardId, title, index, deckId } = request.payload

    if (typeof boardId !== 'string')
      throw Boom.badRequest('boardId must be a string')

    await assertCanEditBoard(request, boardId)

    const portalId = await addPortal({ boardId, title, index, deckId })

    return { portalId }
  },
}

/**
 * @type {import('./types').Route<
 * { title: string, deckId: string, index: number },
 * { cardId: string }
 * >}
 */
export const addCardRoute = {
  method: 'POST',
  path: '/addCard',
  async handler(request) {
    const { title, deckId, index } = request.payload

    requireString({ title, deckId })

    await assertCanEditDeck(request, deckId)

    const cardId = await addCard({ title, deckId, index })

    return { cardId }
  },
}

/**
 * @type {import('./types').Route<
 * { cardId: string },
 * { success: boolean }
 * >}
 */
export const deleteCardRoute = {
  method: 'POST',
  path: '/deleteCard',
  async handler(request) {
    const { cardId } = request.payload

    if (!cardId) throw Boom.badRequest('cardId is required')

    await assertCanEditCard(request, cardId)

    await deleteCard(cardId)

    return { success: true }
  },
}

export const moveCardRoute = {
  method: 'POST',
  path: '/moveCard',
  /**
   * @param {{ payload: { cardId: string, source: string, target: string, index: number }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { cardId, source, target, index } = request.payload

    requireString({ cardId, source, target })
    requireInteger({ index })

    const card = await getCard(cardId)

    if (!card) throw Boom.notFound('The card does not exist')

    if (card.deckId !== source)
      throw Boom.badRequest('Card did not belong to the source deck')

    await assertCanEditBoard(request, card.boardId)

    await moveCard({ cardId, source, target, index })

    return { success: true }
  },
}

export const moveBoardChildToIndexRoute = {
  method: 'POST',
  path: '/moveBoardChildToIndex',
  /**
   * @param {{ payload: { item: import('./types').BoardChild, index: number, boardId: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { item, index, boardId } = request.payload

    if (typeof boardId !== 'string')
      throw Boom.badRequest('boardId must be a string')

    await assertCanEditBoard(request, boardId)

    await moveBoardChildToIndex({ item, index, boardId })

    return { success: true }
  },
}

export const deleteDeckRoute = {
  method: 'POST',
  path: '/deleteDeck',
  /**
   * @param {{ payload: { deckId: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { deckId } = request.payload
    const deck = await knex('decks').where({ deckId }).first()

    await assertCanEditBoard(request, deck.boardId)

    await knex('decks').where({ deckId }).del()

    return { success: true }
  },
}

export const deletePortalRoute = {
  method: 'POST',
  path: '/deletePortal',
  /**
   * @param {{ payload: { portalId: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { portalId } = request.payload

    if (typeof portalId !== 'string')
      throw Boom.badRequest('Please provide a portalId')

    const portal = await knex('portals').where({ portalId }).first()

    if (!portal)
      throw Boom.badRequest('No portal with the given portalId exists')

    await assertCanEditBoard(request, portal.boardId)

    await knex('portals').where({ portalId }).del()

    return { success: true }
  },
}

export const deleteBoardRoute = {
  method: 'POST',
  path: '/deleteBoard',
  /**
   * @param {{ payload: { boardId: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { boardId } = request.payload
    await assertCanEditBoard(request, boardId)

    const decks = await knex('decks').where({ boardId })

    await knex.transaction(async trx => {
      for (const { deckId } of decks) {
        await trx('portals').where({ deckId }).del()
        await trx('cards').where({ deckId }).del()
      }
      await trx('decks').where({ boardId }).del()
      await trx('portals').where({ boardId }).del()
      await trx('boards').where({ boardId }).del()
    })

    return { success: true }
  },
}

export const setDeckColorRoute = {
  method: 'POST',
  path: '/setDeckColor',
  /**
   * @param {{ payload: { deckId: string, color: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { deckId, color } = request.payload
    await assertCanEditDeck(request, deckId)

    await knex('decks').where({ deckId }).update({ color })

    return { success: true }
  },
}

export const setBoardColorRoute = {
  method: 'POST',
  path: '/setBoardColor',
  /**
   * @param {{ payload: { boardId: string, color: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { boardId, color } = request.payload
    await assertCanEditBoard(request, boardId)

    await knex('boards').where({ boardId }).update({ color })

    return { success: true }
  },
}

export const setDeckTitleRoute = {
  method: 'POST',
  path: '/setDeckTitle',
  /**
   * @param {{ payload: { deckId: string, title: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { deckId, title } = request.payload
    await assertCanEditDeck(request, deckId)

    await knex('decks').where({ deckId }).update({ title })

    return { success: true }
  },
}

export const setPortalTitleRoute = {
  method: 'POST',
  path: '/setPortalTitle',
  /**
   * @param {{ payload: { portalId: string, title: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { portalId, title } = request.payload
    await assertCanEditPortal(request, portalId)

    await knex('portals').where({ portalId }).update({ title })

    return { success: true }
  },
}

export const registerUserRoute = {
  method: 'POST',
  path: '/registerUser',
  /**
   * @param {{ payload: { email: string, password: string } }} request
   * @returns {Promise<{ success: boolean }>}
   */
  async handler(request) {
    const { email, password } = request.payload

    requireString({ email, password })

    await createUser({
      password,
      email,
    })

    return { success: true }
  },
}

export const createProjectRoute = {
  method: 'POST',
  path: '/createProject',
  /**
   * @param {{ payload: { title: string }, headers: { authorization: string } }} request
   * @returns {Promise<{ projectId: string }>}
   */
  async handler(request) {
    const { title } = request.payload
    const { userId } = await authenticate(request)

    await assertIsVerified(request)

    const projectId = await createProject({
      createdBy: userId,
      title,
    })

    return { projectId }
  },
}

/**
 * @type {import("@hapi/hapi").ServerRoute}
 */
export const addCardImagesRoute = {
  method: 'POST',
  path: '/addCardImages',
  options: {
    payload: {
      parse: true,
      allow: "multipart/form-data",
      maxBytes: 100 * 1024 ** 3,
      multipart: {
        output: "stream",
      },
    },
  },
  /**
   * @param {{ payload: { cardId: string, image: Stream | Array<Stream> }, headers: { authorization: string } }} request
   * @returns {Promise<Array<string>>}
   */
  async handler(request) {
    try {
      const cardId = request.payload.cardId;
      const images = Array.isArray(request.payload.image)
        ? request.payload.image
        : [request.payload.image].filter(Boolean);

      return await addCardImages(cardId, images);
    } catch (e) {
      console.error(e);
      throw e
    }
  },
};


/**
 * @type {import("@hapi/hapi").ServerRoute}
 */
export const uploadsRoute = {
  method: 'GET',
  path: '/uploads/{fileName}',
  async handler(request) {
    console.log("RETRIEVING UPLOAD:", request);
    return fs.createReadStream(`/tmp/${request.params.fileName}`)
  }
}
